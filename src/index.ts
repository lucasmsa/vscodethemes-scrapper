import dotenv from 'dotenv';
dotenv.config();

import { VscodeThemesCrawler } from './services/vscodethemesCrawler';

const vscodeThemesCrawler = new VscodeThemesCrawler();
vscodeThemesCrawler.execute();
