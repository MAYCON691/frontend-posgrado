// src/types/backend.ts

export type Panorama = {
  id: string;
  slug: string;
  title: string;
  fileUrl: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type HotspotType = 'LINK' | 'INFO';

export type Hotspot = {
  id: string;
  type: HotspotType;

  x: number;
  y: number;
  z: number;
  size?: number;

  // LINK
  label?: string;
  toPanoramaId?: string;

  // INFO
  infoTitle?: string;
  infoSubtitle?: string;
  infoDescription?: string;

  panoramaId: string;
};
