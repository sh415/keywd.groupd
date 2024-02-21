
/** express */
const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

/** modules */
// const { default: axios } = require('axios');
// const L = require("fxjs/Lazy");
// const C = require("fxjs/Concurrency");
// const go = require("fxjs").go;
const puppeteer = require("puppeteer");

/** .env */ 
require('dotenv').config();

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
 * /vpn:
 *   post:
 *     description: vpn ip로 접속을 확인합니다.
 *     responses:
 *       200:
 *         description: 성공
 */
router.post('/vpn', async(req, res) => {
    try {
        const browser = await puppeteer.launch({
            headless: false,
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({
                width: 1920,
                height: 1080
            });
            await page.goto(`https://ip.pe.kr/`, {
                waitUntil: 'domcontentloaded',
                timeout: 15000,
            });

            await waitForTimeout(5000);

        } catch (error) {
            console.log('/vpn -> error', error);

        } finally {
            await browser.close();
        }

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
 * /userAgent:
 *   post:
 *     description: userAgent값을 확인합니다.
 *     responses:
 *       200:
 *         description: 성공
 */
router.post('/userAgent', async(req, res) => {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security', // CORS 정책 우회
                '--disable-features=IsolateOrigins,site-per-process' // 일부 탐지 메커니즘 우회
            ]
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({
                width: 1920,
                height: 1080
            });

            // userAgent 설정
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
            // await page.setExtraHTTPHeaders({
            //     'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            // });

            await page.goto(`https://www.google.com/`, {
                // waitUntil: 'domcontentloaded',
                timeout: 15000,
            });

            // 페이지에 대한 작업을 수행하세요.
            const userAgent = await page.evaluate(() => {
                const ua = navigator.userAgent;
                return ua;
            });

            await waitForTimeout(3000);

            const results = {
                message: userAgent
            }
            res.status(200).send(results);

        } catch (error) {
            console.log('/vpn -> error', error);

        } finally {
            await browser.close();
        }

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
        // const BATCH = 5;

        async function openAndProcessPage(chunk) {
            const browser = await puppeteer.launch({
                headless: 'new',
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
                await page.setViewport({
                    width: 1920,
                    height: 1080
                });
                
                // userAgent 설정
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
                // await page.setExtraHTTPHeaders({
                //     'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
                // });

                // 필요한 리소스 타입만 로드하도록 요청을 필터링
                await page.setRequestInterception(true);
                page.on('request', request => {
                    const resourceType = request.resourceType();
                    if (['document', 'script', 'xhr', 'fetch'].includes(resourceType)) {
                        request.continue();
                    } else {
                        request.abort();
                    }
                });

                const column = chunk.column;
                const row = chunk.row;

                try { // 띄어쓰기
                    await page.goto(`https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${row}+${column}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000,
                    });
                    await waitForTimeout(3000);

                    // 페이지에 대한 작업을 수행하세요.
                    const links1 = await page.evaluate(() => {
                        const elements = document.querySelector('.lst_view').querySelectorAll('.title_link');
                        return Array.from(elements).map(el => el.href);
                    });
                    links = [...links, ...links1];

                } catch (error) {
                    console.log('openAndProcessPage() -> 띄어쓰기 오류', error);
                }

                try { // 붙여쓰기
                    await page.goto(`https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${row}${column}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000,
                    });
                    await waitForTimeout(3000);

                    // 페이지에 대한 작업을 수행하세요.
                    const links2 = await page.evaluate(() => {
                        const elements = document.querySelector('.lst_view').querySelectorAll('.title_link');
                        return Array.from(elements).map(el => el.href);
                    });
                    links = [...links, ...links2];

                } catch (error) {
                    console.log('openAndProcessPage() -> 붙여쓰기 오류', error);
                }

            } catch (error) {
                console.log('openAndProcessPage() -> error', error);
                try {
                    if (page !== null) await page.close(); // finally 절에서 페이지를 닫음
                    await browser.close();
                } catch (error) {
                    console.log(error);
                }

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
            timeoutPromise(30000) // 30초 타임아웃
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
                headless: 'new',
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
                await page.setViewport({
                    width: 1920,
                    height: 1080
                });
                
                // userAgent 설정
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
                // await page.setExtraHTTPHeaders({
                //     'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
                // });

                // 필요한 리소스 타입만 로드하도록 요청을 필터링
                await page.setRequestInterception(true);
                page.on('request', request => {
                    const resourceType = request.resourceType();
                    if (['document', 'script', 'xhr', 'fetch'].includes(resourceType)) {
                        request.continue();
                    } else {
                        request.abort();
                    }
                });

                const column = chunk.column;
                const row = chunk.row;

                try { // 띄어쓰기
                    await page.goto(`https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${row}+${column}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000,
                    });
                    await waitForTimeout(3000);

                    // 페이지에 대한 작업을 수행하세요.
                    const links1 = await page.evaluate(() => {
                        const elements = document.querySelector('.lst_view').querySelectorAll('.title_link');
                        return Array.from(elements).map(el => el.href);
                    });
                    links = [...links, ...links1];

                } catch (error) {
                    console.log('openAndProcessPage() -> 띄어쓰기 오류', error);
                }

                // try { // 붙여쓰기
                //     await page.goto(`https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${row}${column}`, {
                //         waitUntil: 'domcontentloaded',
                //         timeout: 15000,
                //     });
                //     await waitForTimeout(3000);

                //     // 페이지에 대한 작업을 수행하세요.
                //     const links2 = await page.evaluate(() => {
                //         const elements = document.querySelector('.lst_view').querySelectorAll('.title_link');
                //         return Array.from(elements).map(el => el.href);
                //     });
                //     links = [...links, ...links2];

                // } catch (error) {
                //     console.log('openAndProcessPage() -> 붙여쓰기 오류', error);
                // }

            } catch (error) {
                console.log('openAndProcessPage() -> error', error);
                try {
                    if (page !== null) await page.close(); // finally 절에서 페이지를 닫음
                    await browser.close();
                } catch (error) {
                    console.log(error);
                }

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

        // 모든 프로미스가 완료될 때까지 기다림
        const processedResults = await Promise.all(promises);
        // console.log("All pages visited and processed.", processedResults);

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
                headless: 'new',
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
                await page.setViewport({
                    width: 1920,
                    height: 1080
                });
                
                // userAgent 설정
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
                // await page.setExtraHTTPHeaders({
                //     'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
                // });

                // 필요한 리소스 타입만 로드하도록 요청을 필터링
                await page.setRequestInterception(true);
                page.on('request', request => {
                    const resourceType = request.resourceType();
                    if (['document', 'script', 'xhr', 'fetch'].includes(resourceType)) {
                        request.continue();
                    } else {
                        request.abort();
                    }
                });

                const column = chunk.column;
                const row = chunk.row;

                // try { // 띄어쓰기
                //     await page.goto(`https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${row}+${column}`, {
                //         waitUntil: 'domcontentloaded',
                //         timeout: 15000,
                //     });
                //     await waitForTimeout(3000);

                //     // 페이지에 대한 작업을 수행하세요.
                //     const links1 = await page.evaluate(() => {
                //         const elements = document.querySelector('.lst_view').querySelectorAll('.title_link');
                //         return Array.from(elements).map(el => el.href);
                //     });
                //     links = [...links, ...links1];

                // } catch (error) {
                //     console.log('openAndProcessPage() -> 띄어쓰기 오류', error);
                // }

                try { // 붙여쓰기
                    await page.goto(`https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${row}${column}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000,
                    });
                    await waitForTimeout(3000);

                    // 페이지에 대한 작업을 수행하세요.
                    const links2 = await page.evaluate(() => {
                        const elements = document.querySelector('.lst_view').querySelectorAll('.title_link');
                        return Array.from(elements).map(el => el.href);
                    });
                    links = [...links, ...links2];

                } catch (error) {
                    console.log('openAndProcessPage() -> 붙여쓰기 오류', error);
                }

            } catch (error) {
                console.log('openAndProcessPage() -> error', error);
                try {
                    if (page !== null) await page.close(); // finally 절에서 페이지를 닫음
                    await browser.close();
                } catch (error) {
                    console.log(error);
                }

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

        // 모든 프로미스가 완료될 때까지 기다림
        const processedResults = await Promise.all(promises);
        // console.log("All pages visited and processed.", processedResults);

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

// 타임아웃 프로미스를 생성하는 함수
function timeoutPromise(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('timeoutPromise() -> 타임아웃 발생, 30000ms'); // 타임아웃 발생 시 'timeout' 문자열 반환
        }, ms);
    });
}

function waitForTimeout(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;