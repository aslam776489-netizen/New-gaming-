import * as THREE from 'three';
import { ColorPalette } from '../types/simulation';

export const PALETTES: ColorPalette[] = [
  {
    id: 'pygame',
    name: 'Pygame Classic',
    // Exact RGB from python code: [(255,80,120), (0,220,255), (255,200,0), (180,0,255)]
    colors: ['#FF5078', '#00DCFF', '#FFC800', '#B400FF'],
    boundaryColor: '#00DCFF',
    glowColor: '#00DCFF',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    colors: ['#FF0055', '#00F0FF', '#FFE600', '#9D00FF', '#00FF66'],
    boundaryColor: '#FF0055',
    glowColor: '#00F0FF',
  },
  {
    id: 'synthwave',
    name: 'Synthwave Sunset',
    colors: ['#FF2A85', '#FF7700', '#B000FF', '#00E5FF', '#FF0077'],
    boundaryColor: '#FF2A85',
    glowColor: '#B000FF',
  },
  {
    id: 'emerald',
    name: 'Quantum Aurora',
    colors: ['#00FFA3', '#00D1FF', '#70FF00', '#00FFEA', '#1AFF96'],
    boundaryColor: '#00FFA3',
    glowColor: '#00D1FF',
  },
  {
    id: 'solar',
    name: 'Solar Plasma',
    colors: ['#FF3B00', '#FF9500', '#FFD000', '#FF0055', '#FFAA33'],
    boundaryColor: '#FF9500',
    glowColor: '#FF3B00',
  },
  {
    id: 'monochrome',
    name: 'Titanium & Gold',
    colors: ['#FFFFFF', '#FFD700', '#C0C0C0', '#E5E4E2', '#D4AF37'],
    boundaryColor: '#D4AF37',
    glowColor: '#FFFFFF',
  },
];

/**
 * Procedurally generates a circular harmonograph grid texture for the floor
 */
export function createFloorGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#050819';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  // Concentric harmonic rings
  for (let r = 20; r <= size / 2 - 10; r += 32) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = r % 128 === 0 ? 'rgba(0, 220, 255, 0.22)' : 'rgba(0, 220, 255, 0.07)';
    ctx.lineWidth = r % 128 === 0 ? 2 : 1;
    ctx.stroke();
  }

  // Radial spokes (angles)
  const spokes = 36;
  for (let i = 0; i < spokes; i++) {
    const angle = (i * Math.PI * 2) / spokes;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * (size / 2 - 10), cy + Math.sin(angle) * (size / 2 - 10));
    ctx.strokeStyle = i % 9 === 0 ? 'rgba(0, 220, 255, 0.2)' : 'rgba(0, 220, 255, 0.05)';
    ctx.lineWidth = i % 9 === 0 ? 1.5 : 1;
    ctx.stroke();
  }

  // Micro tick marks on outer edge
  for (let i = 0; i < 360; i += 2) {
    const angle = (i * Math.PI) / 180;
    const isMajor = i % 30 === 0;
    const isMedium = i % 10 === 0;
    const len = isMajor ? 16 : isMedium ? 10 : 5;
    const outerR = size / 2 - 20;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (outerR - len), cy + Math.sin(angle) * (outerR - len));
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.strokeStyle = isMajor ? 'rgba(0, 220, 255, 0.5)' : 'rgba(0, 220, 255, 0.2)';
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Procedurally generates a glowing soft particle sprite texture
 */
export function createGlowSpriteTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(0, 220, 255, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural texture for boundary rim with tick marks and scale indices
 */
export function createRimMarkingsTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a0e1c';
  ctx.fillRect(0, 0, width, height);

  // Gradient trim
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(0, 220, 255, 0.6)');
  grad.addColorStop(0.5, 'rgba(10, 20, 40, 0.2)');
  grad.addColorStop(1, 'rgba(0, 220, 255, 0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Etched vertical ticks
  for (let x = 0; x < width; x += 8) {
    const isMajor = x % 64 === 0;
    const isMedium = x % 32 === 0;
    const h = isMajor ? 40 : isMedium ? 24 : 14;
    ctx.fillStyle = isMajor ? '#00e5ff' : 'rgba(0, 220, 255, 0.4)';
    ctx.fillRect(x, (height - h) / 2, isMajor ? 2 : 1, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(4, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}
