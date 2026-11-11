import { en,es } from './common';
import { moveMessages } from './editing';
import { reorderMessages } from './hierarchy';
import { extra } from './screen';
import { settingsMessages } from './settings';
import { typeChangeMessages } from './typeChange';

// Later groups retain the original lookup precedence for shared keys.
const english={...en,...extra.en,...settingsMessages.en,...reorderMessages.en,...typeChangeMessages.en,...moveMessages.en};
const spanish:{[Key in keyof typeof english]:string}={...es,...extra.es,...settingsMessages.es,...reorderMessages.es,...typeChangeMessages.es,...moveMessages.es};

export const messages={en:english,es:spanish};
export type MessageKey=keyof typeof english;
