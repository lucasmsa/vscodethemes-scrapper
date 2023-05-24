import { Page } from 'puppeteer';

export async function handleNotFoundLabel(page: Page) {
  const preElement = await page.$('pre');
  if (preElement) {
    const preTagTextContent = await page.evaluate(
      (pre: any) => pre.textContent,
      preElement,
    );
    return preTagTextContent === 'Not Found';
  }
  return false;
}
