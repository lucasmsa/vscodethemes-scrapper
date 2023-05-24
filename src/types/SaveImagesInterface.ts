import { Page } from 'puppeteer';
import winston from 'winston';

export interface SaveImagesInterface {
  themeURLName: string;
  themeOfficialName: string;
  initialThemeImageURL: string;
}
