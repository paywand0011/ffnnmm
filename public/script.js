class HackerFloodController {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.activeAttacks = new Map();
        this.globalStats = {
            sent: 0,
            successful: 0,
            failed: 0,
            speed: 0,
            startTime: null,
            lastUpdate: Date.now()
        };
        this.autoScroll = true;
        this.pingInterval = null;
        this.statsInterval = null;
        this.resourceInterval = null;
        this.commandHistory = [];
        this.historyIndex = -1;
        
        this.initialize();
    }

    async initialize() {
        // Generate unique user ID
        this.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store in localStorage for persistence
        if (!localStorage.getItem('hacker_flood_userId')) {
            localStorage.setItem('hacker_flood_userId', this.userId);
        } else {
            this.userId = localStorage.getItem('hacker_flood_userId');
        }
        
        this.bindEvents();
        this.updateSliders();
        this.showConnectionModal();
        this.initializeSocket();
        this.startResourceMonitor();
    }

    showConnectionModal() {
        document.getElementById('modalUserId').textContent = this.userId;
        document.getElementById('connectionModal').style.display = 'flex';
        
        // Auto-hide modal after 5 seconds
        setTimeout(() => {
            this.hideConnectionModal();
        }, 5000);
    }

    hideConnectionModal() {
        document.getElementById('connectionModal').style.display = 'none';
    }

    initializeSocket() {
        // Connect with user ID
        this.socket = io({
            query: {
                userId: this.userId
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            this.terminalLog('[✓] WEBSOCKET CONNECTION ESTABLISHED', 'success');
            this.terminalLog(`[✓] USER ID: ${this.userId}`, 'info');
            document.getElementById('userId').textContent = this.userId.substring(0, 15) + '...';
            document.getElementById('startBtn').disabled = false;
            
            // Start ping interval
            this.startPing();
            
            // Request initial stats
            this.socket.emit('get_user_stats');
            this.updateGlobalStats();
        });

        this.socket.on('connected', (data) => {
            this.userId = data.userId;
            localStorage.setItem('hacker_flood_userId', this.userId);
        });

        this.socket.on('attack_started', (data) => {
            const attack = {
                id: data.attackId,
                target: data.target,
                threads: data.threads,
                totalRequests: data.totalRequests,
                sent: 0,
                successful: 0,
                failed: 0,
                startTime: Date.now(),
                isRunning: true
            };
            
            this.activeAttacks.set(data.attackId, attack);
            this.globalStats.startTime = Date.now();
            
            this.terminalLog(`[⚡] ATTACK LAUNCHED: ${data.target}`, 'success');
            this.terminalLog(`[⚡] THREADS: ${data.threads} | REQUESTS: ${this.formatNumber(data.totalRequests)}`, 'info');
            
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            document.getElementById('attackBadge').textContent = 'ATTACK ACTIVE';
            document.getElementById('attackBadge').style.color = 'var(--success)';
            
            this.updateAttackList();
            this.updateUI();
        });

        this.socket.on('attack_progress', (data) => {
            const attack = this.activeAttacks.get(data.attackId);
            if (attack) {
                attack.sent = data.sent;
                attack.successful = data.successful;
                attack.failed = data.failed;
                
                // Update global stats
                this.updateGlobalStats();
                
                // Update progress
                const progress = data.progress;
                const progressFill = document.getElementById('progressFill');
                const progressPercent = document.getElementById('progressPercent');
                const requestsText = document.getElementById('requestsText');
                const speedText = document.getElementById('speedText');
                
                progressFill.style.width = `${progress}%`;
                progressPercent.textContent = `${progress}%`;
                requestsText.textContent = `${this.formatNumber(data.sent)} / ${this.formatNumber(attack.totalRequests)}`;
                
                // Calculate speed
                const now = Date.now();
                const elapsed = (now - attack.startTime) / 1000;
                const speed = elapsed > 0 ? Math.round(data.sent / elapsed) : 0;
                speedText.textContent = `${this.formatNumber(speed)} RPS`;
                
                // Update metrics
                document.getElementById('successCount').textContent = this.formatNumber(data.successful);
                document.getElementById('failedCount').textContent = this.formatNumber(data.failed);
                document.getElementById('activeThreads').textContent = attack.threads;
                document.getElementById('duration').textContent = `${Math.round(elapsed)}s`;
                
                // Update attack list
                this.updateAttackList();
                
                // Update progress bar every 10% or 1000 requests
                if (data.sent % 1000 === 0 || progress % 10 === 0) {
                    this.terminalLog(`[📊] ${data.sent.toLocaleString()} packets sent (${progress}%)`, 'info');
                }
            }
        });

        this.socket.on('attack_complete', (data) => {
            const attack = this.activeAttacks.get(data.attackId);
            if (attack) {
                attack.isRunning = false;
                
                this.terminalLog(`[✓] ATTACK COMPLETED: ${this.formatNumber(data.summary.totalSent)} requests`, 'success');
                this.terminalLog(`[📈] SUCCESS: ${this.formatNumber(data.summary.successful)} | FAILED: ${this.formatNumber(data.summary.failed)}`, 'info');
                
                document.getElementById('startBtn').disabled = false;
                document.getElementById('stopBtn').disabled = true;
                document.getElementById('attackBadge').textContent = 'COMPLETED';
                document.getElementById('attackBadge').style.color = 'var(--secondary)';
                
                // Remove after 5 seconds
                setTimeout(() => {
                    this.activeAttacks.delete(data.attackId);
                    this.updateAttackList();
                }, 5000);
            }
        });

        this.socket.on('attack_stopped', (data) => {
            const attack = this.activeAttacks.get(data.attackId);
            if (attack) {
                attack.isRunning = false;
                
                this.terminalLog(`[✗] ATTACK STOPPED: ${data.message}`, 'warning');
                
                document.getElementById('startBtn').disabled = false;
                document.getElementById('stopBtn').disabled = true;
                
                if (this.activeAttacks.size === 0) {
                    document.getElementById('attackBadge').textContent = 'NO ACTIVE ATTACKS';
                    document.getElementById('attackBadge').style.color = 'var(--secondary)';
                }
                
                // Remove after 3 seconds
                setTimeout(() => {
                    this.activeAttacks.delete(data.attackId);
                    this.updateAttackList();
                }, 3000);
            }
        });

        this.socket.on('all_attacks_stopped', (data) => {
            this.terminalLog(`[✗] ALL ATTACKS STOPPED: ${data.stoppedCount} operation(s) killed`, 'warning');
            
            this.activeAttacks.clear();
            this.updateAttackList();
            
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
            document.getElementById('attackBadge').textContent = 'NO ACTIVE ATTACKS';
            document.getElementById('attackBadge').style.color = 'var(--secondary)';
            
            this.resetProgress();
        });

        this.socket.on('attack_error', (data) => {
            this.terminalLog(`[!] ATTACK ERROR: ${data.error}`, 'error');
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
        });

        this.socket.on('user_stats', (data) => {
            document.getElementById('activeAttackCount').textContent = data.activeAttacks;
            document.getElementById('totalRequests').textContent = this.formatNumber(data.totalRequests);
            document.getElementById('globalSuccessRate').textContent = `${data.successRate}%`;
        });

        this.socket.on('pong', (data) => {
            const ping = Date.now() - data.time;
            document.getElementById('pingValue').textContent = `${ping}ms`;
            
            // Update ping indicator color
            const pingIndicator = document.querySelector('.ping-indicator i');
            if (ping < 100) {
                pingIndicator.style.color = 'var(--success)';
            } else if (ping < 300) {
                pingIndicator.style.color = 'var(--warning)';
            } else {
                pingIndicator.style.color = 'var(--danger)';
            }
        });

        this.socket.on('error', (error) => {
            this.terminalLog(`[!] SOCKET ERROR: ${error.message}`, 'error');
        });

        this.socket.on('disconnect', (reason) => {
            this.terminalLog(`[!] DISCONNECTED: ${reason}`, 'error');
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = true;
            
            // Stop ping interval
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }
        });

        this.socket.on('reconnect', (attemptNumber) => {
            this.terminalLog(`[↻] RECONNECTED (attempt ${attemptNumber})`, 'success');
            document.getElementById('startBtn').disabled = false;
            this.startPing();
        });
    }

    bindEvents() {
        // Start Attack
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startAttack();
        });

        // Stop Attack
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopAttack();
        });

        // Stop All Attacks
        document.getElementById('stopAllBtn').addEventListener('click', () => {
            this.stopAllAttacks();
        });

        // Close Modal
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideConnectionModal();
        });

        // Sliders
        document.getElementById('threadsSlider').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('threadsValue').textContent = value;
            document.getElementById('threads').value = value;
        });

        document.getElementById('requestsSlider').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const displayValue = value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : this.formatNumber(value);
            document.getElementById('requestsValue').textContent = displayValue;
            document.getElementById('requests').value = value;
        });

        // Terminal Input
        document.getElementById('terminalInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateCommandHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateCommandHistory(1);
            }
        });

        document.getElementById('sendCommand').addEventListener('click', () => {
            this.executeCommand();
        });

        // Clear Logs
        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            document.getElementById('terminalContent').innerHTML = '';
            this.terminalLog('[✓] TERMINAL CLEARED', 'success');
        });

        // Export Logs
        document.getElementById('exportLogsBtn').addEventListener('click', () => {
            this.exportLogs();
        });

        // Refresh
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.updateGlobalStats();
            this.terminalLog('[↻] SYSTEM REFRESHED', 'info');
        });

        // Window focus/blur
        window.addEventListener('focus', () => {
            if (this.socket && !this.socket.connected) {
                this.socket.connect();
            }
        });
    }

    startPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('ping', { time: Date.now() });
            }
        }, 5000);
    }

    startResourceMonitor() {
        this.resourceInterval = setInterval(() => {
            // Simulate resource usage (in real app, use actual system metrics)
            const cpu = Math.min(100, Math.random() * 30 + (this.activeAttacks.size * 10));
            const memory = Math.min(100, Math.random() * 40 + (this.activeAttacks.size * 15));
            
            document.getElementById('cpuFill').style.width = `${cpu}%`;
            document.getElementById('cpuPercent').textContent = `${Math.round(cpu)}%`;
            
            document.getElementById('memoryFill').style.width = `${memory}%`;
            document.getElementById('memoryPercent').textContent = `${Math.round(memory)}%`;
            
            // Update uptime
            const uptime = process.uptime ? Math.floor(process.uptime()) : 
                Math.floor((Date.now() - (this.globalStats.startTime || Date.now())) / 1000);
            document.getElementById('uptime').textContent = `${this.formatTime(uptime)}`;
            
        }, 2000);
    }

    updateSliders() {
        const threadsSlider = document.getElementById('threadsSlider');
        const requestsSlider = document.getElementById('requestsSlider');
        
        threadsSlider.value = 300;
        document.getElementById('threadsValue').textContent = '300';
        
        requestsSlider.value = 1000000;
        document.getElementById('requestsValue').textContent = '1M';
    }

    startAttack() {
        const targetUrl = document.getElementById('targetUrl').value.trim();
        const threads = parseInt(document.getElementById('threads').value);
        const totalRequests = parseInt(document.getElementById('requests').value);
        
        if (!targetUrl) {
            this.terminalLog('[!] ERROR: Target URL is required', 'error');
            return;
        }
        
        if (!targetUrl.startsWith('http')) {
            this.terminalLog('[!] ERROR: URL must start with http:// or https://', 'error');
            return;
        }
        
        if (threads < 1 || threads > 500) {
            this.terminalLog('[!] ERROR: Threads must be between 1 and 500', 'error');
            return;
        }
        
        if (totalRequests < 1000 || totalRequests > 2000000) {
            this.terminalLog('[!] ERROR: Requests must be between 1,000 and 2,000,000', 'error');
            return;
        }
        
        // Reset progress
        this.resetProgress();
        
        // Start attack via socket
        this.socket.emit('start_attack', {
            targetUrl: targetUrl,
            threads: threads,
            totalRequests: totalRequests
        });
    }

    stopAttack() {
        if (this.activeAttacks.size > 0) {
            // Stop the first active attack
            const [attackId] = this.activeAttacks.keys();
            this.socket.emit('stop_attack', { attackId: attackId });
        }
    }

    stopAllAttacks() {
        if (this.activeAttacks.size > 0) {
            this.socket.emit('stop_all_attacks');
        } else {
            this.terminalLog('[!] No active attacks to stop', 'warning');
        }
    }

    resetProgress() {
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressPercent').textContent = '0%';
        document.getElementById('requestsText').textContent = '0 / 0';
        document.getElementById('speedText').textContent = '0 RPS';
        
        document.getElementById('successCount').textContent = '0';
        document.getElementById('failedCount').textContent = '0';
        document.getElementById('duration').textContent = '0s';
        
        this.globalStats = {
            sent: 0,
            successful: 0,
            failed: 0,
            speed: 0,
            startTime: null,
            lastUpdate: Date.now()
        };
    }

    updateGlobalStats() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('get_user_stats');
        }
    }

    updateAttackList() {
        const attackList = document.getElementById('attackList');
        
        if (this.activeAttacks.size === 0) {
            attackList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-crosshairs"></i>
                    <p>NO ACTIVE ATTACKS</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        for (const [id, attack] of this.activeAttacks) {
            const progress = attack.totalRequests > 0 ? 
                Math.round((attack.sent / attack.totalRequests) * 100) : 0;
            const elapsed = Math.round((Date.now() - attack.startTime) / 1000);
            const speed = elapsed > 0 ? Math.round(attack.sent / elapsed) : 0;
            
            html += `
                <div class="attack-item">
                    <div class="attack-info">
                        <span class="attack-target">${attack.target}</span>
                        <div class="attack-stats">
                            <span>${this.formatNumber(attack.sent)} sent</span>
                            <span>${progress}%</span>
                            <span>${speed} RPS</span>
                            <span>${elapsed}s</span>
                        </div>
                    </div>
                    <div class="attack-actions">
                        <button onclick="window.floodController.stopSingleAttack('${id}')">
                            <i class="fas fa-stop"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        attackList.innerHTML = html;
    }

    stopSingleAttack(attackId) {
        this.socket.emit('stop_attack', { attackId: attackId });
    }

    updateUI() {
        // Update user count (simulated - in real app would come from server)
        const userCount = Math.floor(Math.random() * 50) + 10;
        document.getElementById('userCount').textContent = userCount;
        
        // Update system info
        fetch('/api/system/stats')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('uaCount').textContent = data.stats.userAgentsLoaded;
                    document.getElementById('proxyCount').textContent = data.stats.proxiesLoaded;
                    document.getElementById('activeAttackCount').textContent = data.stats.totalActiveAttacks;
                    document.getElementById('userCount').textContent = data.stats.totalUsers;
                }
            })
            .catch(error => {
                console.error('Failed to update system info:', error);
            });
    }

    terminalLog(message, type = 'info') {
        const terminal = document.getElementById('terminalContent');
        const time = new Date().toLocaleTimeString();
        const typeClass = type;
        
        const line = document.createElement('div');
        line.className = `terminal-line output ${typeClass}`;
        line.textContent = `[${time}] ${message}`;
        
        terminal.appendChild(line);
        
        if (this.autoScroll) {
            terminal.scrollTop = terminal.scrollHeight;
        }
    }

    executeCommand() {
        const input = document.getElementById('terminalInput');
        const command = input.value.trim();
        
        if (!command) return;
        
        // Add to history
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        
        // Display command
        this.terminalLog(`$ ${command}`, 'command');
        
        // Process command
        this.processCommand(command.toLowerCase());
        
        // Clear input
        input.value = '';
    }

    processCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);
        
        switch(cmd) {
            case 'help':
                this.terminalLog('Available commands:', 'info');
                this.terminalLog('  start <url> [threads] [requests] - Start attack', 'info');
                this.terminalLog('  stop [id] - Stop attack (or all if no id)', 'info');
                this.terminalLog('  status - Show current attacks', 'info');
                this.terminalLog('  stats - Show global statistics', 'info');
                this.terminalLog('  clear - Clear terminal', 'info');
                this.terminalLog('  help - Show this help', 'info');
                break;
                
            case 'start':
                if (args.length >= 1) {
                    const url = args[0];
                    const threads = args[1] ? parseInt(args[1]) : 300;
                    const requests = args[2] ? parseInt(args[2]) : 1000000;
                    
                    document.getElementById('targetUrl').value = url;
                    document.getElementById('threads').value = threads;
                    document.getElementById('requests').value = requests;
                    
                    this.updateSliders();
                    this.startAttack();
                } else {
                    this.terminalLog('Usage: start <url> [threads=300] [requests=1000000]', 'error');
                }
                break;
                
            case 'stop':
                if (args.length > 0) {
                    this.stopSingleAttack(args[0]);
                } else {
                    this.stopAllAttacks();
                }
                break;
                
            case 'status':
                if (this.activeAttacks.size === 0) {
                    this.terminalLog('No active attacks', 'info');
                } else {
                    this.terminalLog(`Active attacks: ${this.activeAttacks.size}`, 'info');
                    for (const [id, attack] of this.activeAttacks) {
                        const progress = attack.totalRequests > 0 ? 
                            Math.round((attack.sent / attack.totalRequests) * 100) : 0;
                        this.terminalLog(`  ${id}: ${attack.target} - ${progress}%`, 'info');
                    }
                }
                break;
                
            case 'stats':
                this.terminalLog(`Sent: ${this.formatNumber(this.globalStats.sent)}`, 'info');
                this.terminalLog(`Successful: ${this.formatNumber(this.globalStats.successful)}`, 'info');
                this.terminalLog(`Failed: ${this.formatNumber(this.globalStats.failed)}`, 'info');
                this.terminalLog(`Speed: ${this.formatNumber(this.globalStats.speed)} RPS`, 'info');
                break;
                
            case 'clear':
                document.getElementById('terminalContent').innerHTML = '';
                this.terminalLog('Terminal cleared', 'success');
                break;
                
            default:
                this.terminalLog(`Unknown command: ${cmd}. Type 'help' for available commands.`, 'error');
        }
    }

    navigateCommandHistory(direction) {
        if (this.commandHistory.length === 0) return;
        
        this.historyIndex = Math.max(0, Math.min(this.commandHistory.length, this.historyIndex + direction));
        
        if (this.historyIndex >= 0 && this.historyIndex < this.commandHistory.length) {
            document.getElementById('terminalInput').value = this.commandHistory[this.historyIndex];
        }
    }

    exportLogs() {
        const terminal = document.getElementById('terminalContent');
        let logText = 'H4CK3R HTTP FLOOD TOOL - TERMINAL LOGS\n';
        logText += '='.repeat(50) + '\n\n';
        logText += `User: ${this.userId}\n`;
        logText += `Export Time: ${new Date().toLocaleString()}\n\n`;
        
        const lines = terminal.querySelectorAll('.terminal-line');
        lines.forEach(line => {
            logText += line.textContent + '\n';
        });
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hacker-flood-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.terminalLog('[✓] Logs exported successfully', 'success');
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.floodController = new HackerFloodController();
    
    // Add global helper function
    window.stopSingleAttack = function(attackId) {
        window.floodController.stopSingleAttack(attackId);
    };
});