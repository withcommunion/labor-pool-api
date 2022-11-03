import { customRandom, urlAlphabet } from 'nanoid';

export function generateUrlFriendlyId(idSize: number) {
  return customRandom(urlAlphabet, idSize, (size) => {
    return new Uint8Array(size).map(() => 256 * Math.random());
  });
}
