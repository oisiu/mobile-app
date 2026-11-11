import { messages, type MessageKey } from './messages/catalog';

export const language = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('es') ? 'es' : 'en';

export const t = (key: MessageKey, params?: Record<string, string | number>) => {
  const message = messages[language][key];
  return params
    ? message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
        params[name] === undefined ? placeholder : String(params[name]),
      )
    : message;
};
