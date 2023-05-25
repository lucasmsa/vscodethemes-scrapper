import {
  NETWORK_IDLE,
  CLOUDFARE_COOKIE,
  TIMEOUT_THRESHOLD,
  CHECK_COOKIE_INTERVAL,
  INTERSTITIAL_SUBSTRING,
  PAGE_NAVIGATION_DELAY,
} from '../../config/constants';
import { HTTPResponse, Page } from 'puppeteer';
import { NavigationInterface } from '../../types/NavigationInterface';
import { delay } from '../time/delay';

export async function handleNavigation({
  page,
  pageURL,
  logger,
}: NavigationInterface) {
  try {
    await bypassCloudflare({ page, pageURL });
  } catch (error) {
    logger.error(`Failed to navigate to page ${page}. Error: ${error}`);
  }
}

async function bypassCloudflare({
  page,
  pageURL,
}: Omit<NavigationInterface, 'logger'>) {
  await delay(PAGE_NAVIGATION_DELAY);
  const response = (await page.goto(pageURL, {
    waitUntil: NETWORK_IDLE,
    timeout: TIMEOUT_THRESHOLD,
  })) as HTTPResponse;

  const isInterstitial = (await response.text()).includes(
    INTERSTITIAL_SUBSTRING,
  );

  if (isInterstitial) {
    await waitForCookie(CLOUDFARE_COOKIE, page);

    await page.goto(pageURL);
  }
}

async function waitForCookie(cookieName: string, page: Page) {
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_THRESHOLD) {
    const cookies = await page.cookies();
    const targetCookie = cookies.find((cookie) => cookie.name === cookieName);

    if (targetCookie) {
      return targetCookie;
    }

    await new Promise((resolve) => setTimeout(resolve, CHECK_COOKIE_INTERVAL));
  }

  throw new Error(`Cookie "${cookieName}" not found within timeout`);
}
