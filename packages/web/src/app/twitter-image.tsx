import { ImageResponse } from 'next/og';
import {
  ShareCard,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from './share-card';

export const alt = shareImageAlt;
export const size = shareImageSize;
export const contentType = shareImageContentType;

export default function TwitterImage() {
  return new ImageResponse(<ShareCard />, {
    ...shareImageSize,
  });
}
