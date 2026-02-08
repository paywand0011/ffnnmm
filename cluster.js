const cluster = require('cluster');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config();

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`Master ${process.pid} is running`);
    console.log(`Forking for ${numCPUs} CPUs`);
    
    // Fork workers
    for (let i = 0; i < Math.min(numCPUs, 4); i++) {
        cluster.fork();
    }
    
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        console.log('Starting a new worker');
        cluster.fork();
    });
    
} else {
    require('./server.js');
    console.log(`Worker ${process.pid} started`);
}