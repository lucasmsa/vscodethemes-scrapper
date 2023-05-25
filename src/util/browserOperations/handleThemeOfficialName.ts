import { Page } from 'puppeteer';

export async function handleThemeOfficialName(page: Page) {
  const themeOfficialNameElement = await page.$('text[x="50%"][y="14"]');
  const themeOfficialName = (await page.evaluate(
    (el) => el?.textContent,
    themeOfficialNameElement,
  )) as string;
  return themeOfficialName?.replace(/\//g, '-');
}
