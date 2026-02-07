(function () {
  'use strict';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let started = false;
  let startTime = 0;
  let animationStartTime = null;
  let backgroundCache = null;
  let staticVineLayer = null;
  let staticTomatoNodes = [];
  const FULL_GROWTH_TIME = 6;
  let spriteCacheByMatrix = [];

  const palette = {
    cream: '#f5e6d3',
    creamDark: '#e8d4bc',
    pink: '#e8b4b8',
    pinkLight: '#f2d5d8',
    green: '#7d9d6d',
    greenLight: '#9bb88a',
    greenDark: '#5a7a4d',
    gold: '#c9a227',
    brown: '#8b6914',
    white: '#fefefe',
    red: '#d32f2f',
    redLight: '#e57373'
  };

  const PALETTE_INDEX = {
    0: null,
    1: palette.green,
    2: palette.greenLight,
    3: palette.pink,
    4: palette.gold,
    5: palette.brown,
    6: palette.green,
    7: palette.greenLight,
    8: palette.green,
    9: palette.greenLight,
    10: palette.red,
    11: palette.redLight,
    12: palette.white,
    13: palette.greenDark
  };

  const PIXEL = 4;
  const DITHER_TYPES = [3, 6, 7, 8, 9];

  function getColorForPixel(index, matrixX, matrixY) {
    const base = PALETTE_INDEX[index];
    if (!base) return null;
    if (DITHER_TYPES.indexOf(index) === -1) return base;
    return (matrixX + matrixY) % 2 === 0 ? base : (index === 3 ? palette.pinkLight : (index === 6 || index === 8 ? palette.greenLight : palette.green));
  }

  function drawSprite(matrix, startX, startY, pixelSize, opts, targetCtx) {
    opts = opts || {};
    const dc = targetCtx || ctx;
    const sway = opts.sway !== undefined ? opts.sway : 0;
    const swayRowFactor = opts.swayRowFactor || function () { return 1; };
    const rotation = opts.rotation !== undefined ? opts.rotation : 0;
    const cols = matrix[0].length;
    const rows = matrix.length;
    const centerX = startX + (cols * pixelSize) / 2;
    const centerY = startY + (rows * pixelSize) / 2;

    const useCache = (sway === 0 || sway === undefined) && spriteCacheByMatrix.some(function (e) { return e.matrix === matrix; });
    if (useCache) {
      const entry = spriteCacheByMatrix.find(function (e) { return e.matrix === matrix; });
      if (entry && entry.canvas) {
        dc.save();
        dc.imageSmoothingEnabled = false;
        if (rotation !== 0) {
          dc.translate(centerX, centerY);
          dc.rotate(rotation);
          dc.translate(-centerX, -centerY);
        }
        const w = entry.canvas.width;
        const h = entry.canvas.height;
        dc.drawImage(entry.canvas, 0, 0, w, h, startX, startY, w * pixelSize, h * pixelSize);
        dc.restore();
        return;
      }
    }

    if (rotation !== 0) {
      dc.save();
      dc.translate(centerX, centerY);
      dc.rotate(rotation);
      dc.translate(-centerX, -centerY);
    }
    matrix.forEach(function (row, matrixY) {
      const rowSway = sway * swayRowFactor(matrixY, matrix.length);
      row.forEach(function (pixel, matrixX) {
        if (pixel === 0) return;
        const color = getColorForPixel(pixel, matrixX, matrixY);
        if (!color) return;
        const px = startX + matrixX * pixelSize + rowSway;
        const py = startY + matrixY * pixelSize;
        dc.fillStyle = color;
        dc.fillRect(px, py, pixelSize, pixelSize);
      });
    });
    if (rotation !== 0) dc.restore();
  }

  const TULIP_SPRITE = [
    [0, 3, 0, 3, 0],
    [3, 3, 3, 3, 3],
    [3, 3, 4, 3, 3],
    [3, 3, 3, 3, 3],
    [0, 3, 3, 3, 0],
    [0, 0, 1, 0, 0],
    [2, 0, 1, 0, 0],
    [0, 2, 1, 2, 0],
    [0, 0, 1, 0, 0]
  ];

  const ROSE_SPRITE = [
    [0, 0, 3, 0, 0],
    [0, 3, 3, 3, 0],
    [3, 3, 4, 3, 3],
    [3, 3, 3, 3, 3],
    [0, 3, 3, 3, 0],
    [0, 0, 1, 0, 0],
    [0, 2, 1, 2, 0],
    [0, 0, 1, 0, 0]
  ];

  const SMALL_FLOWER_SPRITE = [
    [0, 3, 4, 3, 0],
    [3, 3, 3, 3, 3],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0]
  ];

  const SUN_SPRITE = [
    [0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0],
    [0, 0, 0, 4, 4, 4, 4, 12, 4, 4, 4, 4, 0, 0, 0],
    [0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0],
    [0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 12, 4, 4, 4, 12, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 5, 5, 5, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0],
    [0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0],
    [0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0],
    [0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0]
  ];

  const VASE_SPRITE = [
    [0, 0, 5, 5, 5, 0, 0],
    [0, 5, 5, 5, 5, 5, 0],
    [0, 5, 5, 5, 5, 5, 0],
    [5, 5, 5, 5, 5, 5, 5],
    [5, 5, 5, 5, 5, 5, 5],
    [5, 5, 5, 5, 5, 5, 5],
    [0, 5, 5, 5, 5, 5, 0]
  ];

  const VINE_TOP = [
    [0, 0, 6, 7, 6, 0],
    [0, 6, 7, 6, 7, 6],
    [6, 7, 6, 7, 6, 7]
  ];
  const VINE_SIDE = [[6, 7], [7, 6], [6, 7], [7, 6]];
  const GRASS_ROW = [0, 8, 9, 8, 9, 8, 9, 8, 9, 8, 9, 0];

  const VINE_SEGMENTS = {
    TRUNK_KNOT: [
      [0, 13, 1, 13, 0],
      [13, 1, 2, 2, 1],
      [1, 2, 12, 2, 1],
      [13, 1, 2, 2, 1],
      [0, 13, 1, 13, 0]
    ],
    TOMATO_CLUSTER: [
      [0, 10, 11, 0, 0],
      [10, 10, 10, 10, 11],
      [11, 10, 12, 10, 10],
      [10, 10, 11, 10, 0]
    ],
    LEAF_LUSH: [
      [0, 0, 13, 1, 0],
      [0, 13, 1, 2, 1],
      [13, 1, 2, 2, 2],
      [0, 13, 1, 2, 1],
      [0, 0, 13, 1, 0]
    ]
  };

  function renderMatrixToCanvas(matrix) {
    const c = document.createElement('canvas');
    c.width = matrix[0].length;
    c.height = matrix.length;
    const cctx = c.getContext('2d');
    matrix.forEach(function (row, matrixY) {
      row.forEach(function (pixel, matrixX) {
        if (pixel === 0) return;
        const color = getColorForPixel(pixel, matrixX, matrixY);
        if (!color) return;
        cctx.fillStyle = color;
        cctx.fillRect(matrixX, matrixY, 1, 1);
      });
    });
    return c;
  }

  function preRenderSprites() {
    const sprites = [
      VINE_SEGMENTS.TRUNK_KNOT,
      VINE_SEGMENTS.TOMATO_CLUSTER,
      VINE_SEGMENTS.LEAF_LUSH,
      SUN_SPRITE,
      VASE_SPRITE,
      TULIP_SPRITE,
      ROSE_SPRITE
    ];
    sprites.forEach(function (matrix) {
      spriteCacheByMatrix.push({ matrix: matrix, canvas: renderMatrixToCanvas(matrix) });
    });
  }

  const LUSH_TOMATO_VINE = [
    [0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 0, 10, 11],
    [0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 10, 10, 10, 10],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10, 10, 10, 10],
    [0, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 10, 10, 11],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 10, 11, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 2, 2, 0],
    [10, 10, 10, 10, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 0],
    [10, 10, 10, 10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [10, 10, 10, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 10, 10, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 2, 2, 1, 1, 10, 11, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 10, 10, 10, 10, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 10, 10, 10, 10, 1, 1, 1, 1, 1, 0],
    [0, 0, 2, 2, 0, 0, 10, 10, 10, 11, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ];

  const TOMATO_VINE_SPRITE_LEGACY_UNUSED = [
    [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 2, 1, 1, 2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 2, 0, 0, 10, 10, 0, 0],
    [0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 10, 10, 10, 10, 0],
    [0, 0, 2, 2, 2, 1, 1, 1, 1, 1, 1, 2, 0, 10, 10, 10, 10, 0],
    [0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 2, 0, 0, 0, 10, 10, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 2, 2, 1, 1, 1, 2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 10, 10, 0, 2, 1, 1, 1, 2, 0, 0, 2, 2, 0, 0, 0, 0],
    [0, 10, 10, 10, 10, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 0, 0, 0],
    [0, 10, 10, 10, 10, 1, 1, 1, 1, 1, 2, 0, 2, 2, 0, 0, 0, 0],
    [0, 0, 10, 10, 0, 2, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 2, 0, 1, 1, 1, 1, 0, 2, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 2, 0, 1, 1, 1, 1, 0, 2, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 10, 10, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 0, 10, 10, 10, 10, 0, 0],
    [0, 0, 0, 2, 2, 2, 1, 1, 1, 1, 2, 0, 10, 10, 10, 10, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 10, 10, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 2, 0, 1, 1, 1, 1, 0, 2, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 10, 10, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 0, 0, 10, 10, 10, 10, 0],
    [0, 0, 0, 2, 2, 0, 1, 1, 1, 1, 0, 0, 10, 10, 10, 10, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 10, 10, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 10, 10, 0, 0, 0],
    [0, 0, 0, 10, 10, 2, 1, 1, 1, 1, 2, 10, 10, 10, 10, 0, 0, 0],
    [0, 0, 10, 10, 10, 1, 1, 1, 1, 1, 1, 10, 10, 10, 10, 0, 0, 0],
    [0, 0, 10, 10, 10, 1, 1, 1, 1, 1, 1, 10, 10, 10, 0, 0, 0, 0],
    [0, 0, 0, 10, 10, 2, 1, 1, 1, 1, 2, 0, 10, 10, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 10, 10, 0, 0, 0, 0],
    [0, 0, 0, 0, 10, 10, 1, 1, 1, 1, 10, 10, 10, 10, 0, 0, 0, 0],
    [0, 0, 0, 10, 10, 10, 1, 1, 1, 1, 10, 10, 10, 10, 0, 0, 0, 0],
    [0, 0, 0, 0, 10, 10, 1, 1, 1, 1, 0, 10, 10, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
  ];

  const BUTTERFLY_WINGS_UP = [
    [0, 3, 3, 3, 3, 0],
    [3, 3, 4, 4, 3, 3],
    [3, 4, 4, 4, 4, 3],
    [3, 3, 4, 4, 3, 3],
    [0, 3, 5, 5, 3, 0],
    [0, 0, 3, 3, 0, 0]
  ];
  const BUTTERFLY_WINGS_DOWN = [
    [0, 0, 3, 3, 0, 0],
    [3, 3, 3, 3, 3, 3],
    [3, 3, 4, 4, 3, 3],
    [3, 3, 4, 4, 3, 3],
    [3, 3, 3, 3, 3, 3],
    [0, 0, 3, 3, 0, 0]
  ];

  function setSize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    if (ctx) ctx.scale(dpr, dpr);
    backgroundCache = null;
    staticVineLayer = null;
    screenButterflies.length = 0;
  }

  const BAYER_4X4 = [
    [0 / 16, 8 / 16, 2 / 16, 10 / 16],
    [12 / 16, 4 / 16, 14 / 16, 6 / 16],
    [3 / 16, 11 / 16, 1 / 16, 9 / 16],
    [15 / 16, 7 / 16, 13 / 16, 5 / 16]
  ];

  function parseHex(color) {
    const n = parseInt(color.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function preRenderBackground() {
    const cw = canvas.width;
    const ch = canvas.height;
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = cw;
    bgCanvas.height = ch;
    const bgCtx = bgCanvas.getContext('2d');
    const creamRgb = parseHex(palette.cream);
    const creamDarkRgb = parseHex(palette.creamDark);
    const id = bgCtx.getImageData(0, 0, cw, ch);
    const data = id.data;
    for (let py = 0; py < ch; py++) {
      const t = py / ch;
      const inten = 4 * t * (1 - t);
      for (let px = 0; px < cw; px++) {
        const threshold = BAYER_4X4[py % 4][px % 4];
        const rgb = inten > threshold ? creamDarkRgb : creamRgb;
        const i = (py * cw + px) * 4;
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
        data[i + 3] = 255;
      }
    }
    bgCtx.putImageData(id, 0, 0);
    backgroundCache = bgCanvas;
  }

  function drawBackground() {
    if (!backgroundCache) preRenderBackground();
    ctx.drawImage(backgroundCache, 0, 0);
  }

  const titleText = 'Su gimtadieniu, Mamuk!';
  const messageText = 'Ačiū už viską, ką dėl manęs darai, ir linkiu kuo daugiau nuveikti ateinančiais metais.';
  const signatureText = 'Su meile, tavo sūnus Džiugas';

  function wrapText(text, maxWidth, fontSize) {
    ctx.font = fontSize + 'px Lora, serif';
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(function (w) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else {
        if (line) lines.push(line);
        line = w;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawText(elapsed) {
    const titleStart = 0.5;
    const messageStart = 1.0;
    const signatureStart = 1.8;
    const fadeDur = 0.7;

    const titleAlpha = Math.min(1, Math.max(0, (elapsed - titleStart) / fadeDur));
    const messageAlpha = Math.min(1, Math.max(0, (elapsed - messageStart) / fadeDur));
    const signatureAlpha = Math.min(1, Math.max(0, (elapsed - signatureStart) / fadeDur));

    const scale = Math.min(1, width / 800);
    const titleSize = Math.round(28 * scale);
    const messageSize = Math.round(16 * scale);
    const sigSize = Math.round(14 * scale);

    const centerX = width / 2;
    const maxTextWidth = width * 0.75;

    if (titleAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = titleAlpha;
      ctx.font = '700 ' + titleSize + 'px Lora, serif';
      ctx.fillStyle = palette.brown;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(titleText, centerX, height * 0.42);
      ctx.restore();
    }

    if (messageAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = messageAlpha;
      ctx.font = messageSize + 'px Lora, serif';
      ctx.fillStyle = palette.brown;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = wrapText(messageText, maxTextWidth, messageSize);
      const lineHeight = messageSize * 1.35;
      const startY = height * 0.5 - (lines.length - 1) * lineHeight / 2;
      lines.forEach(function (line, i) {
        ctx.fillText(line, centerX, startY + i * lineHeight);
      });
      ctx.restore();
    }

    if (signatureAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = signatureAlpha;
      ctx.font = 'italic ' + sigSize + 'px Lora, serif';
      ctx.fillStyle = palette.brown;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(signatureText, centerX, height - 30);
      ctx.restore();
    }
  }

  function drawGround(targetCtx) {
    const dc = targetCtx || ctx;
    const ps = PIXEL;
    const cols = Math.ceil(width / (ps * GRASS_ROW.length)) + 1;
    const grassY = height - ps * 3;
    for (let row = 0; row < 3; row++) {
      for (let c = 0; c < cols; c++) {
        GRASS_ROW.forEach(function (pixel, matrixX) {
          if (pixel === 0) return;
          const color = getColorForPixel(pixel, matrixX + c * GRASS_ROW.length, row);
          if (!color) return;
          dc.fillStyle = color;
          dc.fillRect(c * GRASS_ROW.length * ps + matrixX * ps, grassY + row * ps, ps, ps);
        });
      }
    }
  }

  function drawBorder(targetCtx) {
    const dc = targetCtx || ctx;
    const ps = PIXEL;
    const margin = 12;
    const thick = 3;
    const wobble = 2.5;
    const freq = 0.02;
    const w = width;
    const h = height;
    dc.fillStyle = palette.brown;

    for (let x = margin; x < w - margin; x += ps) {
      const wy = Math.sin(x * freq) * wobble;
      for (let d = 0; d < thick; d++) {
        dc.fillRect(Math.floor(x), Math.floor(margin + wy + d * ps), ps, ps);
      }
    }
    for (let y = margin; y < h - margin; y += ps) {
      const wx = Math.sin(y * freq) * wobble;
      for (let d = 0; d < thick; d++) {
        dc.fillRect(Math.floor(w - margin + wx - d * ps), Math.floor(y), ps, ps);
      }
    }
    for (let x = w - margin; x > margin; x -= ps) {
      const wy = Math.sin(x * freq) * wobble;
      for (let d = 0; d < thick; d++) {
        dc.fillRect(Math.floor(x), Math.floor(h - margin + wy - d * ps), ps, ps);
      }
    }
    for (let y = h - margin; y > margin; y -= ps) {
      const wx = Math.sin(y * freq) * wobble;
      for (let d = 0; d < thick; d++) {
        dc.fillRect(Math.floor(margin + wx + d * ps), Math.floor(y), ps, ps);
      }
    }
  }

  function topHeavySway(matrixY, totalRows) {
    return 1 - matrixY / Math.max(1, totalRows);
  }

  function quadraticBezier(p0, p1, p2, t) {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }
  function quadraticBezierTangent(p0, p1, p2, t) {
    const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  const VINE_GROWTH_RATE = 85;
  const BRANCH_GROWTH_RATE = 55;
  const tomatoNodes = [];

  function drawOrganicVine(path, elapsed, type, opts, targetCtx) {
    opts = opts || {};
    const dc = targetCtx || ctx;
    const isBranch = opts.isBranch === true;
    const isBackground = opts.isBackground === true;
    const growthStartTime = opts.growthStartTime;
    const branchScale = opts.branchScale != null ? opts.branchScale : 1;
    const steps = isBackground ? 100 : (isBranch ? 120 : 280);
    const baseSize = (isBackground ? 5 : (isBranch ? 4 : 9)) * (isBranch ? branchScale : 1);
    const taperN = 1.5;
    const effectiveElapsed = (growthStartTime != null) ? Math.max(0, elapsed - growthStartTime) : elapsed;
    const maxStep = isBranch
      ? Math.min(steps, Math.max(0, Math.floor(effectiveElapsed * BRANCH_GROWTH_RATE)))
      : Math.min(steps, Math.max(0, Math.floor(elapsed * VINE_GROWTH_RATE)));

    if (isBackground) dc.globalAlpha = 0.45;
    const wobbleMult = isBackground ? 0.4 : 1;

    function staticWobble(t) {
      const lowFreq = Math.sin(t * 5) * 10 * wobbleMult;
      const highFreq = Math.sin(t * 50) * 2 * wobbleMult;
      return lowFreq + highFreq;
    }

    const silhouetteStep = 3;
    const leftPoints = [];
    const rightPoints = [];
    for (let i = 0; i <= maxStep; i += silhouetteStep) {
      const t = i / steps;
      const pt = quadraticBezier(path.p0, path.p1, path.p2, t);
      const tangent = quadraticBezierTangent(path.p0, path.p1, path.p2, t);
      const scale = baseSize * Math.pow(1 - t, taperN) + 1;
      const r = scale * 2.5;
      const wobble = staticWobble(t);
      const cx = pt.x + wobble;
      const nx = -tangent.y;
      const ny = tangent.x;
      leftPoints.push({ x: cx - nx * r, y: pt.y - ny * r });
      rightPoints.push({ x: cx + nx * r, y: pt.y + ny * r });
    }
    if (leftPoints.length > 1) {
      dc.fillStyle = palette.greenDark;
      dc.beginPath();
      dc.moveTo(leftPoints[0].x, leftPoints[0].y);
      for (let j = 1; j < leftPoints.length; j++) dc.lineTo(leftPoints[j].x, leftPoints[j].y);
      for (let j = rightPoints.length - 1; j >= 0; j--) dc.lineTo(rightPoints[j].x, rightPoints[j].y);
      dc.closePath();
      dc.fill();
    }

    for (let i = 0; i <= maxStep; i++) {
      const t = i / steps;
      const pt = quadraticBezier(path.p0, path.p1, path.p2, t);
      const tangent = quadraticBezierTangent(path.p0, path.p1, path.p2, t);
      const angle = Math.atan2(tangent.y, tangent.x);
      const scale = baseSize * Math.pow(1 - t, taperN) + 1;
      if (scale < 1) continue;

      const drawX = pt.x + staticWobble(t);
      const drawY = pt.y;

      const tw = VINE_SEGMENTS.TRUNK_KNOT[0].length * scale;
      drawSprite(VINE_SEGMENTS.TRUNK_KNOT, drawX - tw / 2, drawY - tw / 2, scale, {
        rotation: angle + Math.PI / 2
      }, dc);

      if (i % 25 === 0 && t > 0.1) {
        const side = (i % 50 === 0) ? 1 : -1;
        const clusterPs = scale * 0.8;
        const perpAngle = angle + Math.PI / 2;
        const nx = Math.cos(perpAngle);
        const ny = Math.sin(perpAngle);
        const offDist = side * scale * 4;
        const gx = drawX + nx * offDist;
        const gy = drawY + ny * offDist;
        const lw = VINE_SEGMENTS.LEAF_LUSH[0].length * clusterPs;
        const lh = VINE_SEGMENTS.LEAF_LUSH.length * clusterPs;
        drawSprite(VINE_SEGMENTS.LEAF_LUSH, gx - lw / 2, gy - lh / 2, clusterPs, {
          rotation: perpAngle
        }, dc);
        if (type === 'tomato' && (i * 7) % 10 > 4) {
          const offDist2 = side * scale * 6;
          const gx2 = drawX + nx * offDist2 + tangent.x * 8;
          const gy2 = drawY + ny * offDist2 + tangent.y * 8;
          const tcw = VINE_SEGMENTS.TOMATO_CLUSTER[0].length * clusterPs;
          const tch = VINE_SEGMENTS.TOMATO_CLUSTER.length * clusterPs;
          drawSprite(VINE_SEGMENTS.TOMATO_CLUSTER, gx2 - tcw / 2, gy2 - tch / 2, clusterPs, {
            rotation: perpAngle
          }, dc);
          if (!isBackground) tomatoNodes.push({ x: gx2, y: gy2 });
        }
      }

      if (!isBranch && !isBackground && i % 42 === 0 && t > 0.25 && t < 0.82) {
        const growthStartTime = i / VINE_GROWTH_RATE;
        const branchScaleVal = 1 - (t - 0.25) / 0.57 * 0.5;
        const side = (i * 13) % 2 === 0 ? 1 : -1;
        const angleOff = ((i * 17) % 41) / 41 * 0.7 - 0.35;
        const branchAngle = angle + side * Math.PI / 2 + angleOff;
        const dist1 = 55 + (i * 23) % 45;
        const dist2 = 100 + (i * 19) % 70;
        const p1x = drawX + Math.cos(branchAngle) * dist1 - Math.sin(angle) * 15;
        const p1y = drawY + Math.sin(branchAngle) * dist1 + Math.cos(angle) * 15;
        const bend = 0.15 + ((i * 7) % 20) / 20 * 0.25;
        const p2x = p1x + Math.cos(branchAngle + bend) * dist2 + ((i * 11) % 30 - 15);
        const p2y = p1y + Math.sin(branchAngle + bend) * dist2 - 20 - (i * 5) % 25;
        const branchPath = {
          p0: { x: drawX, y: drawY },
          p1: { x: p1x, y: p1y },
          p2: { x: p2x, y: p2y }
        };
        drawOrganicVine(branchPath, elapsed, 'leaf', { isBranch: true, growthStartTime: growthStartTime, branchScale: branchScaleVal }, dc);
      }
    }
    if (isBackground) dc.globalAlpha = 1;
  }

  function drawTomatoPlant(elapsed, targetCtx) {
    const w = width;
    const h = height;

    const framingPath = {
      p0: { x: w * 0.08, y: h },
      p1: { x: -w * 0.05, y: h * 0.15 },
      p2: { x: w * 0.5, y: h * 0.28 }
    };

    const underlinePath = {
      p0: { x: w * 0.06, y: h },
      p1: { x: w * 0.35, y: h * 0.85 },
      p2: { x: w * 0.55, y: h * 0.52 }
    };
    const leftMidPath = {
      p0: { x: w * 0.04, y: h },
      p1: { x: w * 0.22, y: h * 0.6 },
      p2: { x: w * 0.38, y: h * 0.4 }
    };

    drawOrganicVine(framingPath, elapsed, 'tomato', undefined, targetCtx);
    drawOrganicVine(underlinePath, elapsed, 'tomato', undefined, targetCtx);
    drawOrganicVine(leftMidPath, elapsed, 'tomato', undefined, targetCtx);
  }

  function drawBouquet(elapsed) {
    const ps = PIXEL * 2;
    const vaseW = VASE_SPRITE[0].length * ps;
    const vaseH = VASE_SPRITE.length * ps;
    const vaseX = (width - vaseW) / 2;
    const vaseY = height - vaseH - ps * 6;

    drawSprite(VASE_SPRITE, vaseX, vaseY, ps);

    const sway = Math.sin(elapsed * 0.9) * 6;
    const centerX = width / 2;
    const flowerPs = PIXEL * 1.5;
    const tulipW = TULIP_SPRITE[0].length * flowerPs;
    const roseW = ROSE_SPRITE[0].length * flowerPs;

    drawSprite(TULIP_SPRITE, centerX - tulipW - flowerPs * 3, vaseY - TULIP_SPRITE.length * flowerPs - 8, flowerPs, { sway: sway, swayRowFactor: topHeavySway });
    drawSprite(ROSE_SPRITE, centerX - roseW / 2, vaseY - ROSE_SPRITE.length * flowerPs - 4, flowerPs, { sway: -sway * 0.7, swayRowFactor: topHeavySway });
    drawSprite(TULIP_SPRITE, centerX + flowerPs * 2, vaseY - TULIP_SPRITE.length * flowerPs - 10, flowerPs, { sway: -sway * 0.8, swayRowFactor: topHeavySway });
  }

  const sparkles = [];
  function initSparkles() {
    for (let i = 0; i < 50; i++) {
      sparkles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.3 + Math.random() * 0.5,
        size: 1
      });
    }
  }
  function drawSparkles(elapsed) {
    if (sparkles.length === 0) initSparkles();
    ctx.fillStyle = palette.gold;
    sparkles.forEach(function (s) {
      s.y += s.speed;
      if (s.y > height) { s.y = 0; s.x = Math.random() * width; }
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(elapsed * 2 + s.x * 0.01);
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;
  }

  const BUTTERFLY_SIZE = 2;
  const FLAP_PERIOD = 0.15;
  const BUTTERFLY_VARIANTS = [
    { wing: palette.pink, body: palette.gold, accent: palette.brown },
    { wing: palette.gold, body: palette.brown, accent: palette.pink },
    { wing: palette.pinkLight, body: palette.pink, accent: palette.gold },
    { wing: palette.greenLight, body: palette.gold, accent: palette.pink },
    { wing: palette.green, body: palette.pinkLight, accent: palette.brown }
  ];
  function getButterflyFrame(elapsed, phase) {
    const t = (elapsed + (phase || 0)) / FLAP_PERIOD;
    return Math.floor(t) % 2 === 0 ? BUTTERFLY_WINGS_UP : BUTTERFLY_WINGS_DOWN;
  }
  function getButterflyColor(pixel, variant) {
    if (!variant) return getColorForPixel(pixel, 0, 0);
    const v = BUTTERFLY_VARIANTS[variant % BUTTERFLY_VARIANTS.length];
    if (pixel === 3) return v.wing;
    if (pixel === 4) return v.body;
    if (pixel === 5) return v.accent;
    return null;
  }
  function drawOneButterfly(x, y, elapsed, phase, variant, forceWingsDown) {
    const matrix = forceWingsDown ? BUTTERFLY_WINGS_DOWN : getButterflyFrame(elapsed, phase);
    const ps = BUTTERFLY_SIZE;
    const w = matrix[0].length * ps;
    const h = matrix.length * ps;
    const startX = x - w / 2;
    const startY = y - h / 2;
    if (variant === undefined || variant === null) {
      drawSprite(matrix, startX, startY, ps);
      return;
    }
    matrix.forEach(function (row, matrixY) {
      row.forEach(function (pixel, matrixX) {
        if (pixel === 0) return;
        const color = getButterflyColor(pixel, variant);
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(startX + matrixX * ps, startY + matrixY * ps, ps, ps);
      });
    });
  }

  let pointerX = null;
  let pointerY = null;
  let cursorButterflyX = 0;
  let cursorButterflyY = 0;
  const CURSOR_LERP = 0.08;

  function onPointerMove(x, y) {
    pointerX = x;
    pointerY = y;
  }
  function onPointerLeave() {
    pointerX = null;
    pointerY = null;
  }

  const MAX_SCREEN_BUTTERFLIES = 12;
  const screenButterflies = [];
  const LAND_RADIUS = 48;
  const LAND_DURATION = 3;

  function initScreenButterflies() {
    if (screenButterflies.length > 0) return;
    const margin = 40;
    for (let i = 0; i < MAX_SCREEN_BUTTERFLIES; i++) {
      const x = margin + Math.random() * (width - 2 * margin);
      const y = margin + Math.random() * (height - 2 * margin);
      screenButterflies.push({
        x: x,
        y: y,
        targetX: x,
        targetY: y,
        nextTargetTime: 2,
        phase: Math.random() * 2,
        variant: i % BUTTERFLY_VARIANTS.length,
        landUntil: 0,
        landX: 0,
        landY: 0
      });
    }
  }
  function nodeKey(x, y) {
    return Math.round(x / 8) * 8 + ',' + Math.round(y / 8) * 8;
  }

  function drawScreenButterflies(elapsed) {
    initScreenButterflies();
    const occupiedNodes = {};
    screenButterflies.forEach(function (b, idx) {
      if (b.landUntil > 0 && elapsed <= b.landUntil) {
        occupiedNodes[nodeKey(b.landX, b.landY)] = true;
      }
    });
    screenButterflies.forEach(function (b, idx) {
      if (elapsed >= b.nextTargetTime) {
        b.targetX = 60 + (idx * 97 + Math.floor(elapsed) * 31) % (width - 120);
        b.targetY = 60 + (idx * 73 + Math.floor(elapsed) * 17) % (height - 120);
        b.nextTargetTime = elapsed + 2 + (idx % 3) * 0.5;
      }
      if (b.landUntil > 0) {
        if (elapsed > b.landUntil) b.landUntil = 0;
        else {
          b.x = b.landX;
          b.y = b.landY;
          drawOneButterfly(b.x, b.y, elapsed, b.phase, b.variant, true);
          return;
        }
      }
      let nearest = null;
      let nearestD = LAND_RADIUS + 1;
      tomatoNodes.forEach(function (node) {
        if (occupiedNodes[nodeKey(node.x, node.y)]) return;
        const d = Math.hypot(b.x - node.x, b.y - node.y);
        if (d < nearestD) { nearestD = d; nearest = node; }
      });
      if (nearest && nearestD < LAND_RADIUS) {
        b.landUntil = elapsed + LAND_DURATION;
        b.landX = nearest.x;
        b.landY = nearest.y;
        b.x = nearest.x;
        b.y = nearest.y;
        occupiedNodes[nodeKey(nearest.x, nearest.y)] = true;
        drawOneButterfly(b.x, b.y, elapsed, b.phase, b.variant, true);
        return;
      }
      b.x += (b.targetX - b.x) * 0.02;
      b.y += (b.targetY - b.y) * 0.02;
      const minDist = 28;
      screenButterflies.forEach(function (other, j) {
        if (j === idx || (other.landUntil > 0 && elapsed <= other.landUntil)) return;
        const dx = b.x - other.x;
        const dy = b.y - other.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < minDist) {
          const nudge = (minDist - d) / d;
          b.x += dx * nudge * 0.5;
          b.y += dy * nudge * 0.5;
        }
      });
      drawOneButterfly(b.x, b.y, elapsed, b.phase, b.variant);
    });
  }
  function updateAndDrawCursorButterfly(elapsed) {
    if (pointerX !== null && pointerY !== null) {
      cursorButterflyX += (pointerX - cursorButterflyX) * CURSOR_LERP;
      cursorButterflyY += (pointerY - cursorButterflyY) * CURSOR_LERP;
    }
    drawOneButterfly(cursorButterflyX, cursorButterflyY, elapsed, 0, 0);
  }

  function drawSun(targetCtx) {
    const dc = targetCtx || ctx;
    const ps = 10;
    const x = Math.max(20, 0.04 * width);
    const y = Math.max(20, 0.05 * height);
    const sunW = SUN_SPRITE[0].length * ps;
    const sunH = SUN_SPRITE.length * ps;
    const cx = x + sunW / 2;
    const cy = y + sunH / 2;
    const baseR = Math.max(sunW, sunH) / 2;

    dc.fillStyle = palette.gold;
    for (let ring = 1; ring <= 3; ring++) {
      const r = baseR + ring * 14;
      const steps = Math.max(24, Math.floor(r * 0.8));
      for (let s = 0; s < steps; s++) {
        const angle = (s / steps) * Math.PI * 2;
        if ((s * 11 + ring * 7) % 5 >= 2) continue;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        const haloPs = 4;
        dc.globalAlpha = 0.4 + (3 - ring) * 0.15;
        dc.fillRect(Math.floor(px - haloPs / 2), Math.floor(py - haloPs / 2), haloPs, haloPs);
      }
    }
    dc.globalAlpha = 1;

    drawSprite(SUN_SPRITE, x, y, ps, undefined, dc);
  }

  const confettiParticles = [];
  let confettiSpawned = false;
  const CONFETTI_COLORS = [palette.red, palette.redLight, palette.gold, palette.pink, palette.pinkLight, palette.green, palette.greenLight];

  function spawnConfetti() {
    if (confettiSpawned) return;
    confettiSpawned = true;
    const count = 120;
    const cx = width / 2;
    const cy = height * 0.35;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 * 3 + Math.random() * 0.5;
      const speed = 180 + Math.random() * 220;
      confettiParticles.push({
        x0: cx,
        y0: cy,
        vx: Math.cos(angle) * speed * (0.4 + Math.random() * 0.6),
        vy: Math.sin(angle) * speed * (0.4 + Math.random() * 0.6) - 80,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation0: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        maxLife: 3.5 + Math.random() * 1.5
      });
    }
  }

  function updateAndDrawConfetti(elapsed) {
    if (elapsed <= 0) return;
    if (!confettiSpawned && elapsed < 0.1) spawnConfetti();
    const gravity = 420;
    confettiParticles.forEach(function (p) {
      if (elapsed >= p.maxLife) return;
      const x = p.x0 + p.vx * elapsed;
      const y = p.y0 + p.vy * elapsed + 0.5 * gravity * elapsed * elapsed;
      const rotation = p.rotation0 + p.rotSpeed * elapsed;
      const alpha = 1 - elapsed / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
  }

  function drawVineLayer(elapsed, targetCtx) {
    const dc = targetCtx || ctx;
    const w = width;
    const h = height;
    const bgPath1 = { p0: { x: w * 0.12, y: h }, p1: { x: w * 0.15, y: h * 0.5 }, p2: { x: w * 0.4, y: h * 0.4 } };
    const bgPath2 = { p0: { x: w * 0.04, y: h }, p1: { x: w * 0.25, y: h * 0.75 }, p2: { x: w * 0.5, y: h * 0.5 } };
    drawOrganicVine(bgPath1, elapsed, 'leaf', { isBackground: true }, dc);
    drawOrganicVine(bgPath2, elapsed, 'leaf', { isBackground: true }, dc);
    const rightBgPath = { p0: { x: w * 0.98, y: h * 0.6 }, p1: { x: w * 0.75, y: h * 0.4 }, p2: { x: w * 0.55, y: h * 0.5 } };
    drawOrganicVine(rightBgPath, elapsed, 'leaf', { isBackground: true }, dc);
    drawTomatoPlant(elapsed, dc);
    const rightPath1 = { p0: { x: w * 0.96, y: h }, p1: { x: w * 0.85, y: h * 0.5 }, p2: { x: w * 0.62, y: h * 0.35 } };
    const rightPath2 = { p0: { x: w * 0.94, y: h * 0.85 }, p1: { x: w * 0.82, y: h * 0.6 }, p2: { x: w * 0.68, y: h * 0.55 } };
    drawOrganicVine(rightPath1, elapsed, 'tomato', undefined, dc);
    drawOrganicVine(rightPath2, elapsed, 'tomato', undefined, dc);
    drawGround(dc);
    drawBorder(dc);
    drawSun(dc);
  }

  function drawScene(elapsed) {
    tomatoNodes.length = 0;
    if (staticVineLayer) {
      ctx.drawImage(staticVineLayer, 0, 0);
      tomatoNodes.push.apply(tomatoNodes, staticTomatoNodes);
    } else {
      drawVineLayer(elapsed, ctx);
      if (elapsed >= FULL_GROWTH_TIME) {
        staticVineLayer = document.createElement('canvas');
        staticVineLayer.width = width * dpr;
        staticVineLayer.height = height * dpr;
        const staticCtx = staticVineLayer.getContext('2d');
        staticCtx.scale(dpr, dpr);
        drawVineLayer(FULL_GROWTH_TIME, staticCtx);
        staticTomatoNodes = tomatoNodes.slice();
      }
    }
    drawBouquet(elapsed);
    drawSparkles(elapsed);
    drawScreenButterflies(elapsed);
    updateAndDrawCursorButterfly(elapsed);
    updateAndDrawConfetti(elapsed);
  }

  function loop(t) {
    if (!started) {
      startTime = t;
      started = true;
    }
    if (animationStartTime === 0) animationStartTime = t;
    const elapsed = (animationStartTime !== null && animationStartTime !== undefined)
      ? (t - animationStartTime) / 1000 : 0;

    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawScene(elapsed);
    drawText(elapsed);

    requestAnimationFrame(loop);
  }

  function init() {
    setSize();
    preRenderSprites();
    cursorButterflyX = width / 2;
    cursorButterflyY = height / 2;
    window.addEventListener('resize', setSize);
    requestAnimationFrame(loop);

    function getCanvasCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }
    canvas.addEventListener('mousemove', function (e) {
      const p = getCanvasCoords(e);
      onPointerMove(p.x, p.y);
    });
    canvas.addEventListener('mouseleave', onPointerLeave);
    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      const p = getCanvasCoords(e);
      onPointerMove(p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('touchcancel', onPointerLeave);
    canvas.addEventListener('touchend', function (e) {
      if (e.touches.length === 0) onPointerLeave();
    });
  }

  const overlay = document.getElementById('tap-overlay');
  if (overlay) {
    function startAnimation() {
      overlay.classList.add('unwrapping');
      setTimeout(function () {
        overlay.classList.add('hidden');
        animationStartTime = performance.now();
        if (!started) started = true;
      }, 720);
    }
    overlay.addEventListener('click', startAnimation);
    overlay.addEventListener('touchstart', function (e) {
      e.preventDefault();
      startAnimation();
    }, { passive: false });
  } else {
    animationStartTime = 0;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
