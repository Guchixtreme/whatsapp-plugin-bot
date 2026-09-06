export const PREFIX = '!';
export const BOT_NAME = 'Guchi X';

// Mode settings: 'public' (everyone) or 'private' (owner only)
export let WORK_MODE = 'public'; 

// Your phone number with country code (no '+' or spaces)
export const OWNER_NUMBER = '233509283260'; 

export function setWorkMode(mode) {
  WORK_MODE = mode;
}