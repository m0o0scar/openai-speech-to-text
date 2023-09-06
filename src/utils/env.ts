import UAParser from 'ua-parser-js';

const isSSR = typeof window === 'undefined';
export const isDev = process.env.NODE_ENV === 'development';
export const isTest = !isSSR && location.hostname.startsWith('test-');

const uaParser = new UAParser(!isSSR ? navigator.userAgent : undefined);
const { type, vendor } = uaParser.getDevice();
const { name } = uaParser.getBrowser();

export const isIphone = () => {
  return type === 'mobile' && vendor === 'Apple';
};

export const isIpad = () => {
  return type === 'tablet' && vendor === 'Apple';
};

export const isMobileSafari = () => {
  return name === 'Mobile Safari';
};

export const isMobile = () => {
  return type === 'mobile' || type === 'tablet';
};
