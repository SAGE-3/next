/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

const puppeteer = require('puppeteer');

const token = ''

async function runTest() {
  const browser = await puppeteer.launch({
    headless: false, // true,
    timeout: 13000,
    defaultViewport: {
      width: 2 * 1920,
      height: 2 * 1080,
    },
  });

  const page = await browser.newPage();
  page.setExtraHTTPHeaders({
    Authorization: `Bearer ${token}`,
  });
  // Allows you to intercept a request; must appear before
  // your first page.goto()
  await page.setRequestInterception(true);

  function jwtLogin(interceptedRequest) {
    interceptedRequest.continue({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  }
  function CreateUser(interceptedRequest) {
    interceptedRequest.continue({
      method: 'POST',
      postData: JSON.stringify({ name: 'test1', email: 'test1@gmail.com' }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  }
  // page.once('request', jwtLogin);

  // const r1 = await page.goto('http://localhost:4200/auth/jwt');
  // const user = await r1.json();
  // console.log('User>>>', user);

  page.once('request', CreateUser);
  const r2 = await page.goto('http://localhost:4200/api/users');

  console.log('before page');
  page.setRequestInterception(false);

  // const [button] = await page.$x("//button[contains(., 'Create Account')]");
  // if (button) {
  //   console.log('click');
  //   await button.click();
  // }

  const url = 'http://localhost:4200/#/board/4cc5c6f1-ad8a-4589-9f9f-5e131c096173/14b5f9b5-af51-4a87-817d-00001c911f96';

  await page.goto(url, { waitUntil: 'networkidle2' });
  console.log('after page');
  // await page.waitForNavigation();

  await page.screenshot({ path: 'fullpage.png', fullPage: true });
  // browser.close();
}

runTest();

/*

def jwtLogin():
    """Post to login, return user UUID
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.post(web_server + '/auth/jwt', headers=head)
    return r


def createUser(payload):
    """Create a user
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.post(web_server + '/api/users', headers=head, json=payload)
    return r
*/
