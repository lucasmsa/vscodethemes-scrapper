import { Page } from 'puppeteer';
import winston from 'winston';

export interface NavigationInterface {
  page: Page;
  pageURL: string;
  logger: winston.Logger;
}
