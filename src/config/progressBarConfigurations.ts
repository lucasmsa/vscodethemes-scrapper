import * as cliProgress from 'cli-progress';
import colors from 'ansi-colors';

export const progressBarConfigurations = {
  opt: {
    format:
      'Pages progress |' +
      colors.green('{bar}') +
      '| {percentage}% || {value}/{total} Processed pages',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  },
  preset: cliProgress.Presets.shades_classic,
};
