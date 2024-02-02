
/** express */
const express = require('express');
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
        // const results = {
        //     message: true
        // }
        // res.status(200).send(results);

        const browser = await puppeteer.launch({
            headless: false,
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({
                width: 1600,
                height: 900
            });
            await page.goto(`https://ip.pe.kr/`, {
                // waitUntil: 'domcontentloaded',
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

router.post('/keywd', async(req, res) => {
    try {
        const chunk = req.body.chunk;
        // const BATCH = 5;

        async function openAndProcessPage(chunk) {
            const browser = await puppeteer.launch({
                headless: true,
            });

            try {
                const page = await browser.newPage();
                await page.setViewport({
                    width: 1366,
                    height: 768
                });
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
                let links = [];

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

                // console.log('openAndProcessPage() -> titles', links);
                return { links: links, cell: chunk }; // 링크 배열을 반환합니다.

            } catch (error) {
                console.log('openAndProcessPage() -> error', error);
                return { links: [], cell: chunk }; // error, 빈 배열 반환

            } finally {
                await browser.close();
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

    } catch (error) {
        console.error(error);
    }
});

function waitForTimeout(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;