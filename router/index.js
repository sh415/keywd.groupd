
/** express */
const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

/** modules */
const { default: axios } = require('axios');
const puppeteer = require("puppeteer");

/** .env */ 
require('dotenv').config();
const MIN_PAGE_LOADTIME = parseInt(process.env.MIN_PAGE_LOADTIME, 2);
const MAX_PAGE_LOADTIME = parseInt(process.env.MAX_PAGE_LOADTIME, 10);
const MIN_AWAIT_FOR_SAFETY = parseInt(process.env.MIN_AWAIT_FOR_SAFETY, 5);
const MAX_AWAIT_FOR_SAFETY = parseInt(process.env.MAX_AWAIT_FOR_SAFETY, 10);

/**
 * @swagger
 * /:
 *   get:
 *     description: 홈 페이지를 반환합니다.
 *     responses:
 *       200:
 *         description: 성공
 */
router.get('/', (req, res) => {
    try {
        res.render('index');
    } catch (error) {
        console.error(error);
    }
});

/**
 * @swagger
 * /responses:
 *   post:
 *     description: 서버의 응답을 반환합니다.
 *     responses:
 *       200:
 *         description: 성공
 */
router.post('/responses', async(req, res) => {
    try {
        const results = {
            message: true
        }
        res.status(200).send(results);

    } catch (error) {
        console.error(error);
    }
});

/**
 * @swagger
 * /restart:
 *   post:
 *     description: 재시작
 *     responses:
 *       200:
 *         description: 성공
 */

// exec를 Promise로 감싸는 함수
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`exec error: ${error}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
            resolve(stdout);
        });
    });
}

router.post('/restart', async(req, res) => {
    try {
        // execPromise를 사용하여 npm restart 명령 실행
        const stdout = await execPromise('npm restart');
        console.log(`stdout: ${stdout}`);

        // exec의 작업이 성공적으로 완료된 후에 응답 보내기
        res.status(200).send(true);

    } catch (error) {
        console.error(error);
    }
});

router.post('/keywd', async(req, res) => {
    try {
        const chunk = req.body.chunk;
        const contents = req.body.contents;
        const keywdVisible = contents.keywdVisible;
        console.log(contents, keywdVisible);
        // const BATCH = 5;

        async function openAndProcessPage(chunk) {
            const browser = await puppeteer.launch({
                headless: false, // 'new',
                // args: [
                //     '--no-sandbox',
                //     '--disable-setuid-sandbox',
                //     '--disable-web-security', // CORS 정책 우회
                //     '--disable-features=IsolateOrigins,site-per-process' // 일부 탐지 메커니즘 우회
                // ]
            });

            let page = null; // page 변수를 try 블록 외부에서 선언
            let links = [];

            try {
                page = await browser.newPage();
                // await page.setViewport({
                //     width: 1920,
                //     height: 1080
                // });
                
                // // userAgent 설정
                // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
                // await page.setExtraHTTPHeaders({
                //     'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
                // });

                // // 필요한 리소스 타입만 로드하도록 요청을 필터링
                // await page.setRequestInterception(true);
                // page.on('request', request => {
                //     const resourceType = request.resourceType();
                //     if (['document', 'script', 'xhr', 'fetch'].includes(resourceType)) {
                //         request.continue();
                //     } else {
                //         request.abort();
                //     }
                // });

                const column = chunk.column;
                const row = chunk.row;

                try { // 띄어쓰기
                    await page.goto(`https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${row}+${column}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000,
                    });
                    const wait = waitForSafety(MIN_PAGE_LOADTIME, MAX_PAGE_LOADTIME);
                    console.log('openAndProcessPage() -> waitForSafety(MIN_PAGE_LOADTIME, MAX_PAGE_LOADTIME) -> wait', wait);
                    await waitForTimeout(wait);
                    
                    // 스크린샷을 서버에 업로드
                    const screenshotBuffer = await page.screenshot({ 
                        encoding: 'base64',
                        fullPage: true, // 전체 페이지 캡처
                    });
                    const response = await axios.post(`http://220.78.244.99:3000/content/keywd/upload`, {
                        image: screenshotBuffer,
                        cell: chunk,
                        type: 'space',
                        work: 'update',
                    }, {
                        headers: {
                        'Content-Type': 'application/json'
                        }
                    });
                    console.log(response);

                    // 페이지에 대한 작업을 수행하세요.
                    let links1 = await page.evaluate(() => {
                        // const elements = document.querySelector('.lst_view').querySelectorAll('.title_link');
                        //return Array.from(elements).map(el => el.href);

                        let totalTit = document.querySelectorAll('.total_tit');
                        let titleArea = document.querySelectorAll('.title_area');

                        // // .total_source 요소를 배열로 변환하여 map 함수 적용
                        // const tt = Array.from(totalTit).map(e => {
                        //     const titleLink = e.querySelector('.link_tit'); // 해당 .total_tit 첫 번째 .link_tit 요소를 선택
                        //     return titleLink ? titleLink.getAttribute('href') : ''; // .link_tit 요소가 존재하면 href 속성 값을 반환하고, 없으면 공백 반환
                        // });
                        // const ta = Array.from(titleArea).map(e => {
                        //     const titleLink = e.querySelector('.title_link'); // 해당 .title_area 첫 번째 .title_link 요소를 선택
                        //     return titleLink ? titleLink.getAttribute('href') : ''; // .title_link 요소가 존재하면 href 속성 값을 반환하고, 없으면 공백 반환
                        // });

                        // return [...tt, ...ta];

                        // 1. 두 NodeList를 하나의 배열로 결합
                        const allElements = [...totalTit, ...titleArea];

                        // 2. 이 배열을 DOM 상에서의 순서대로 정렬
                        const sortElements = [...allElements].sort((a, b) => {
                            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
                        });

                        // 3. 링크 추출
                        const extractionLinks = Array.from(sortElements).map(e => {
                            let titleLink = '';
                            titleLink = e.querySelector('.link_tit');
                            if (titleLink) {
                                return titleLink ? titleLink.getAttribute('href') : '';
                            }
                            titleLink = e.querySelector('.title_link');
                            if (titleLink) {
                                return titleLink ? titleLink.getAttribute('href') : '';
                            }
                            if (!titleLink) {
                                return '';
                            }
                        });
                        return extractionLinks;
                    });

                    // links1 = links1.filter(item => item !== '');
                    if (keywdVisible === null) {
                        // 기본값: 7위까지
                        links1 = links1.slice(0, 7); 

                    } else if (keywdVisible === 0) {
                        // 제한없음

                    } else {
                        // 설정한 값
                        links1 = links1.slice(0, keywdVisible);
                    }

                    links = [...links, ...links1];

                } catch (error) {
                    console.log('openAndProcessPage() -> 띄어쓰기 오류', error);
                }

                // 안정성을 위한 대기시간
                const wait = waitForSafety(MIN_AWAIT_FOR_SAFETY, MAX_AWAIT_FOR_SAFETY);
                console.log('openAndProcessPage() -> waitForSafety(MIN_AWAIT_FOR_SAFETY, MAX_AWAIT_FOR_SAFETY) -> wait', wait);
                await waitForTimeout(wait);
                // await waitForTimeout(10000);

                try { // 붙여쓰기
                    await page.goto(`https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${row}${column}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000,
                    });
                    const wait = waitForSafety(MIN_PAGE_LOADTIME, MAX_PAGE_LOADTIME);
                    console.log('openAndProcessPage() -> waitForSafety(MIN_PAGE_LOADTIME, MAX_PAGE_LOADTIME) -> wait', wait);
                    await waitForTimeout(wait);
                    
                    // 스크린샷을 서버에 업로드
                    const screenshotBuffer = await page.screenshot({ 
                        encoding: 'base64',
                        fullPage: true, // 전체 페이지 캡처
                    });
                    const response = await axios.post(`http://220.78.244.99:3000/content/keywd/upload`, {
                        image: screenshotBuffer,
                        cell: chunk,
                        type: 'paste',
                        work: 'add',
                    }, {
                        headers: {
                        'Content-Type': 'application/json'
                        }
                    });
                    console.log(response);

                    // 페이지에 대한 작업을 수행하세요.
                    let links2 = await page.evaluate(() => {
                        // const elements = document.querySelector('.lst_view').querySelectorAll('.title_link');
                        // return Array.from(elements).map(el => el.href);

                        let totalTit = document.querySelectorAll('.total_tit');
                        let titleArea = document.querySelectorAll('.title_area');

                        // // .total_source 요소를 배열로 변환하여 map 함수 적용
                        // const tt = Array.from(totalTit).map(e => {
                        //     const titleLink = e.querySelector('.link_tit'); // 해당 .total_tit 첫 번째 .link_tit 요소를 선택
                        //     return titleLink ? titleLink.getAttribute('href') : ''; // .link_tit 요소가 존재하면 href 속성 값을 반환하고, 없으면 공백 반환
                        // });
                        // const ta = Array.from(titleArea).map(e => {
                        //     const titleLink = e.querySelector('.title_link'); // 해당 .title_area 첫 번째 .title_link 요소를 선택
                        //     return titleLink ? titleLink.getAttribute('href') : ''; // .title_link 요소가 존재하면 href 속성 값을 반환하고, 없으면 공백 반환
                        // });

                        // return [...tt, ...ta];

                        // 1. 두 NodeList를 하나의 배열로 결합
                        const allElements = [...totalTit, ...titleArea];

                        // 2. 이 배열을 DOM 상에서의 순서대로 정렬
                        const sortElements = [...allElements].sort((a, b) => {
                            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
                        });

                        // 3. 링크 추출
                        const extractionLinks = Array.from(sortElements).map(e => {
                            let titleLink = '';
                            titleLink = e.querySelector('.link_tit');
                            if (titleLink) {
                                return titleLink ? titleLink.getAttribute('href') : '';
                            }
                            titleLink = e.querySelector('.title_link');
                            if (titleLink) {
                                return titleLink ? titleLink.getAttribute('href') : '';
                            }
                            if (!titleLink) {
                                return '';
                            }
                        });
                        return extractionLinks;
                    });

                    // links2 = links2.filter(item => item !== '');
                    if (!keywdVisible) {
                        // 기본값: 7위까지
                        links2 = links2.slice(0, 7); 

                    } else if (keywdVisible === 0) {
                        // 제한없음

                    } else {
                        // 설정한 값
                        links2 = links2.slice(0, keywdVisible);
                    }

                    links = [...links, ...links2];

                } catch (error) {
                    console.log('openAndProcessPage() -> 붙여쓰기 오류', error);
                }

            } catch (error) {
                console.log('openAndProcessPage() -> error', error);

            } finally {
                try {
                    if (page !== null) await page.close(); // finally 절에서 페이지를 닫음
                    await browser.close();
                    return { links: links, cell: chunk };

                } catch (error) {
                    console.log(error);
                }
            }
        }

        // 각 청크에 대해 openAndProcessPage 함수를 실행하고, 결과를 배열로 반환
        const promises = chunk.map(openAndProcessPage);

        // 모든 프로미스에 대해 타임아웃을 적용
        const promisesWithTimeout = promises.map(promise => Promise.race([
            promise,
            timeoutPromise(60000) // 60초 타임아웃
        ]));

        // 모든 프로미스가 완료될 때까지 기다림
        // const processedResults = await Promise.all(promises);
        const processedResults = await Promise.all(promisesWithTimeout);

        // async function main() {
        //     const processedResults = await go(
        //         chunk,
        //         L.map(openAndProcessPage),
        //         C.takeAll(BATCH)
        //     );
          
        //     // 모든 작업이 완료된 후에 여기에서 결과를 처리할 수 있습니다.
        //     console.log("All pages visited and processed.", processedResults);
        // }
        
        // main();

        res.status(200).send(processedResults);

        /** 서버 재시작 코드 
         * execPromise를 사용하여 npm restart 명령 실행
        */
        const stdout = await execPromise('npm restart');
        console.log(`stdout: ${stdout}`);

    } catch (error) {
        console.error(error);
    }
});

router.post('/keywd/space', async(req, res) => {
    try {
        const chunk = req.body.chunk;
        // const BATCH = 5;

        async function openAndProcessPage(chunk) {
            const browser = await puppeteer.launch({
                headless: false, // 'new',
                // args: [
                //     '--no-sandbox',
                //     '--disable-setuid-sandbox',
                //     '--disable-web-security', // CORS 정책 우회
                //     '--disable-features=IsolateOrigins,site-per-process' // 일부 탐지 메커니즘 우회
                // ]
            });

            let page = null; // page 변수를 try 블록 외부에서 선언
            let links = [];

            try {
                page = await browser.newPage();
                // await page.setViewport({
                //     width: 1920,
                //     height: 1080
                // });
                
                // // userAgent 설정
                // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
                // await page.setExtraHTTPHeaders({
                //     'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
                // });

                // // 필요한 리소스 타입만 로드하도록 요청을 필터링
                // await page.setRequestInterception(true);
                // page.on('request', request => {
                //     const resourceType = request.resourceType();
                //     if (['document', 'script', 'xhr', 'fetch'].includes(resourceType)) {
                //         request.continue();
                //     } else {
                //         request.abort();
                //     }
                // });

                const column = chunk.column;
                const row = chunk.row;

                try { // 띄어쓰기
                    await page.goto(`https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${row}+${column}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000,
                    });
                    const wait = waitForSafety(MIN_PAGE_LOADTIME, MAX_PAGE_LOADTIME);
                    console.log('openAndProcessPage() -> waitForSafety(MIN_PAGE_LOADTIME, MAX_PAGE_LOADTIME) -> wait', wait);
                    await waitForTimeout(wait);

                    // 스크린샷을 서버에 업로드
                    const screenshotBuffer = await page.screenshot({ 
                        encoding: 'base64',
                        fullPage: true, // 전체 페이지 캡처
                    });
                    const response = await axios.post(`http://220.78.244.99:3000/content/keywd/upload`, {
                        image: screenshotBuffer,
                        cell: chunk,
                        type: 'space',
                        work: 'update',
                    }, {
                        headers: {
                        'Content-Type': 'application/json'
                        }
                    });
                    console.log(response);

                    // 페이지에 대한 작업을 수행하세요.
                    let links1 = await page.evaluate(() => {
                        // const elements = document.querySelector('.lst_view').querySelectorAll('.title_link');
                        // return Array.from(elements).map(el => el.href);

                        let totalTit = document.querySelectorAll('.total_tit');
                        let titleArea = document.querySelectorAll('.title_area');

                        // // .total_source 요소를 배열로 변환하여 map 함수 적용
                        // const tt = Array.from(totalTit).map(e => {
                        //     const titleLink = e.querySelector('.link_tit'); // 해당 .total_tit 첫 번째 .link_tit 요소를 선택
                        //     return titleLink ? titleLink.getAttribute('href') : ''; // .link_tit 요소가 존재하면 href 속성 값을 반환하고, 없으면 공백 반환
                        // });
                        // const ta = Array.from(titleArea).map(e => {
                        //     const titleLink = e.querySelector('.title_link'); // 해당 .title_area 첫 번째 .title_link 요소를 선택
                        //     return titleLink ? titleLink.getAttribute('href') : ''; // .title_link 요소가 존재하면 href 속성 값을 반환하고, 없으면 공백 반환
                        // });

                        // return [...tt, ...ta];

                        // 1. 두 NodeList를 하나의 배열로 결합
                        const allElements = [...totalTit, ...titleArea];

                        // 2. 이 배열을 DOM 상에서의 순서대로 정렬
                        const sortElements = [...allElements].sort((a, b) => {
                            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
                        });

                        // 3. 링크 추출
                        const extractionLinks = Array.from(sortElements).map(e => {
                            let titleLink = '';
                            titleLink = e.querySelector('.link_tit');
                            if (titleLink) {
                                return titleLink ? titleLink.getAttribute('href') : '';
                            }
                            titleLink = e.querySelector('.title_link');
                            if (titleLink) {
                                return titleLink ? titleLink.getAttribute('href') : '';
                            }
                            if (!titleLink) {
                                return '';
                            }
                        });
                        return extractionLinks;
                    });
                    
                    // links1 = links1.filter(item => item !== '');
                    if (!keywdVisible) {
                        // 기본값: 7위까지
                        links1 = links1.slice(0, 7); 

                    } else if (keywdVisible === 0) {
                        // 제한없음

                    } else {
                        // 설정한 값
                        links1 = links1.slice(0, keywdVisible);
                    }

                    links = [...links, ...links1];

                } catch (error) {
                    console.log('openAndProcessPage() -> 띄어쓰기 오류', error);
                }

                // 안정성을 위한 대기시간
                const wait = waitForSafety(MIN_AWAIT_FOR_SAFETY, MAX_AWAIT_FOR_SAFETY);
                console.log('openAndProcessPage() -> waitForSafety(MIN_AWAIT_FOR_SAFETY, MAX_AWAIT_FOR_SAFETY) -> wait', wait);
                await waitForTimeout(wait);
                // await waitForTimeout(10000);

            } catch (error) {
                console.log('openAndProcessPage() -> error', error);

            } finally {
                try {
                    if (page !== null) await page.close(); // finally 절에서 페이지를 닫음
                    await browser.close();
                    return { links: links, cell: chunk }; // error, 빈 배열 반환

                } catch (error) {
                    console.log(error);
                }
            }
        }

        // 각 청크에 대해 openAndProcessPage 함수를 실행하고, 결과를 배열로 반환
        const promises = chunk.map(openAndProcessPage);

        // 모든 프로미스에 대해 타임아웃을 적용
        const promisesWithTimeout = promises.map(promise => Promise.race([
            promise,
            timeoutPromise(60000) // 60초 타임아웃
        ]));

        // 모든 프로미스가 완료될 때까지 기다림
        const processedResults = await Promise.all(promisesWithTimeout);

        // async function main() {
        //     const processedResults = await go(
        //         chunk,
        //         L.map(openAndProcessPage),
        //         C.takeAll(BATCH)
        //     );
          
        //     // 모든 작업이 완료된 후에 여기에서 결과를 처리할 수 있습니다.
        //     console.log("All pages visited and processed.", processedResults);
        // }
        
        // main();

        res.status(200).send(processedResults);

        /** 서버 재시작 코드 
         * execPromise를 사용하여 npm restart 명령 실행
        */
        const stdout = await execPromise('npm restart');
        console.log(`stdout: ${stdout}`);

    } catch (error) {
        console.error(error);
    }
});

router.post('/keywd/paste', async(req, res) => {
    try {
        const chunk = req.body.chunk;
        // const BATCH = 5;

        async function openAndProcessPage(chunk) {
            const browser = await puppeteer.launch({
                headless: false,
                // headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security', // CORS 정책 우회
                    '--disable-features=IsolateOrigins,site-per-process' // 일부 탐지 메커니즘 우회
                ]
            });

            let page = null; // page 변수를 try 블록 외부에서 선언
            let links = [];

            try {
                page = await browser.newPage();
                // await page.setViewport({
                //     width: 1920,
                //     height: 1080
                // });
                
                // // userAgent 설정
                // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
                // await page.setExtraHTTPHeaders({
                //     'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
                // });

                // // 필요한 리소스 타입만 로드하도록 요청을 필터링
                // await page.setRequestInterception(true);
                // page.on('request', request => {
                //     const resourceType = request.resourceType();
                //     if (['document', 'script', 'xhr', 'fetch'].includes(resourceType)) {
                //         request.continue();
                //     } else {
                //         request.abort();
                //     }
                // });

                const column = chunk.column;
                const row = chunk.row;

                try { // 붙여쓰기
                    await page.goto(`https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${row}${column}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000,
                    });
                    const wait = waitForSafety(MIN_PAGE_LOADTIME, MAX_PAGE_LOADTIME);
                    console.log('openAndProcessPage() -> waitForSafety(MIN_PAGE_LOADTIME, MAX_PAGE_LOADTIME) -> wait', wait);
                    await waitForTimeout(wait);

                    // 스크린샷을 서버에 업로드
                    const screenshotBuffer = await page.screenshot({ 
                        encoding: 'base64',
                        fullPage: true, // 전체 페이지 캡처
                    });
                    const response = await axios.post(`http://220.78.244.99:3000/content/keywd/upload`, {
                        image: screenshotBuffer,
                        cell: chunk,
                        type: 'paste',
                        work: 'update',
                    }, {
                        headers: {
                        'Content-Type': 'application/json'
                        }
                    });
                    console.log(response);

                    // 페이지에 대한 작업을 수행하세요.
                    let links2 = await page.evaluate(() => {
                        // const elements = document.querySelector('.lst_view').querySelectorAll('.title_link');
                        // return Array.from(elements).map(el => el.href);

                        let totalTit = document.querySelectorAll('.total_tit');
                        let titleArea = document.querySelectorAll('.title_area');

                        // // .total_source 요소를 배열로 변환하여 map 함수 적용
                        // const tt = Array.from(totalTit).map(e => {
                        //     const titleLink = e.querySelector('.link_tit'); // 해당 .total_tit 첫 번째 .link_tit 요소를 선택
                        //     return titleLink ? titleLink.getAttribute('href') : ''; // .link_tit 요소가 존재하면 href 속성 값을 반환하고, 없으면 공백 반환
                        // });
                        // const ta = Array.from(titleArea).map(e => {
                        //     const titleLink = e.querySelector('.title_link'); // 해당 .title_area 첫 번째 .title_link 요소를 선택
                        //     return titleLink ? titleLink.getAttribute('href') : ''; // .title_link 요소가 존재하면 href 속성 값을 반환하고, 없으면 공백 반환
                        // });

                        // return [...tt, ...ta];

                        // 1. 두 NodeList를 하나의 배열로 결합
                        const allElements = [...totalTit, ...titleArea];

                        // 2. 이 배열을 DOM 상에서의 순서대로 정렬
                        const sortElements = [...allElements].sort((a, b) => {
                            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
                        });

                        // 3. 링크 추출
                        const extractionLinks = Array.from(sortElements).map(e => {
                            let titleLink = '';
                            titleLink = e.querySelector('.link_tit');
                            if (titleLink) {
                                return titleLink ? titleLink.getAttribute('href') : '';
                            }
                            titleLink = e.querySelector('.title_link');
                            if (titleLink) {
                                return titleLink ? titleLink.getAttribute('href') : '';
                            }
                            if (!titleLink) {
                                return '';
                            }
                        });
                        return extractionLinks;
                    });

                    // links2 = links2.filter(item => item !== '');
                    if (!keywdVisible) {
                        // 기본값: 7위까지
                        links2 = links2.slice(0, 7); 

                    } else if (keywdVisible === 0) {
                        // 제한없음

                    } else {
                        // 설정한 값
                        links2 = links2.slice(0, keywdVisible);
                    }
                    links = [...links, ...links2];

                } catch (error) {
                    console.log('openAndProcessPage() -> 붙여쓰기 오류', error);
                }

                // 안정성을 위한 대기시간
                const wait = waitForSafety(MIN_AWAIT_FOR_SAFETY, MAX_AWAIT_FOR_SAFETY);
                console.log('openAndProcessPage() -> waitForSafety(MIN_AWAIT_FOR_SAFETY, MAX_AWAIT_FOR_SAFETY) -> wait', wait);
                await waitForTimeout(wait);
                // await waitForTimeout(10000);

            } catch (error) {
                console.log('openAndProcessPage() -> error', error);

            } finally {
                try {
                    if (page !== null) await page.close(); // finally 절에서 페이지를 닫음
                    await browser.close();
                    return { links: links, cell: chunk }; // error, 빈 배열 반환

                } catch (error) {
                    console.log(error);
                }
            }
        }

        // 각 청크에 대해 openAndProcessPage 함수를 실행하고, 결과를 배열로 반환
        const promises = chunk.map(openAndProcessPage);

        // 모든 프로미스에 대해 타임아웃을 적용
        const promisesWithTimeout = promises.map(promise => Promise.race([
            promise,
            timeoutPromise(60000) // 60초 타임아웃
        ]));

        // 모든 프로미스가 완료될 때까지 기다림
        const processedResults = await Promise.all(promisesWithTimeout);

        // async function main() {
        //     const processedResults = await go(
        //         chunk,
        //         L.map(openAndProcessPage),
        //         C.takeAll(BATCH)
        //     );
          
        //     // 모든 작업이 완료된 후에 여기에서 결과를 처리할 수 있습니다.
        //     console.log("All pages visited and processed.", processedResults);
        // }
        
        // main();

        res.status(200).send(processedResults);

        /** 서버 재시작 코드 
         * execPromise를 사용하여 npm restart 명령 실행
        */
        const stdout = await execPromise('npm restart');
        console.log(`stdout: ${stdout}`);

    } catch (error) {
        console.error(error);
    }
});

/** 타임아웃 프로미스를 생성하는 함수 */
function timeoutPromise(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('timeoutPromise() -> 타임아웃 발생, 60000ms'); // 타임아웃 발생 시 'timeout' 문자열 반환
        }, ms);
    });
}

/** 대기시간을 설정하는 함수 */
const waitForSafety = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
} 

function waitForTimeout(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;