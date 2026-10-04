export interface ResponsiveLayoutInput {
  /** Available size inside safe area and keyboard avoidance, in layout points. */
  width: number;
  height: number;
  appScale?: number;
  systemFontScale?: number;
}

export interface ResponsiveLayout {
  width: number;
  height: number;
  effectiveFontScale: number;
  compact: boolean;
  compactHeight: boolean;
  horizontalPadding: number;
  usableWidth: number;
  contentMaxWidth: number;
  readingMaxWidth: number;
  headerMaxWidth: number;
  footerMaxWidth: number;
  navigationMaxWidth: number;
  headerVerticalPadding: number;
  footerVerticalPadding: number;
  navigationVerticalPadding: number;
  sectionColumns: 1 | 2;
  columnWidth: number;
  /** For title/action rows only; chips and filters keep their own wrapping. */
  stackRows: boolean;
  layoutKey: string;
}

export interface ResponsiveInsets {top: number; bottom: number; left: number; right: number;}
export interface ResponsiveMeasurement {width: number; height: number; windowKey: string;}

const positive = (value: number | undefined, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
const inset = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

/** Changes in window or safe-area geometry invalidate the previous layout event. */
export function responsiveWindowKey(width: number, height: number, insets: ResponsiveInsets): string {
  return [width,height,insets.top,insets.bottom,insets.left,insets.right].join(':');
}

export function responsiveViewport(
  windowWidth: number, windowHeight: number, insets: ResponsiveInsets,
  measured: ResponsiveMeasurement | null,
): {width: number; height: number} {
  const windowKey = responsiveWindowKey(windowWidth,windowHeight,insets);
  if (measured?.windowKey === windowKey && measured.width > 0 && measured.height > 0 &&
      Number.isFinite(measured.width) && Number.isFinite(measured.height)) {
    return {width: measured.width, height: measured.height};
  }
  return {
    width: Math.max(1,positive(windowWidth,320)-inset(insets.left)-inset(insets.right)),
    height: Math.max(1,positive(windowHeight,640)-inset(insets.top)-inset(insets.bottom)),
  };
}

/** Device names never determine columns: a tablet split window may be phone-sized. */
export function getResponsiveLayout(input: ResponsiveLayoutInput): ResponsiveLayout {
  const width = positive(input.width,320), height = positive(input.height,640);
  const effectiveFontScale = positive(input.appScale,1)*positive(input.systemFontScale,1);
  const compactHeight = height < 500;
  const compact = width < 600 || compactHeight;
  const contentMaxWidth = 1160;
  const horizontalPadding = Math.min(width/4,width < 360 ? 12 : compact ? 16 : width < 1000 ? 24 : 28);
  const usableWidth = Math.max(0,Math.min(width,contentMaxWidth)-horizontalPadding*2);
  const possibleColumnWidth = (usableWidth-16)/2;
  const sectionColumns: 1 | 2 = !compact && usableWidth >= 1000 &&
    effectiveFontScale <= 1.3+Number.EPSILON && possibleColumnWidth >= 400 ? 2 : 1;
  const readingMaxWidth = Math.min(840,760*Math.max(1,effectiveFontScale));
  return {
    width,height,effectiveFontScale,compact,compactHeight,horizontalPadding,usableWidth,
    contentMaxWidth,readingMaxWidth,
    headerMaxWidth:contentMaxWidth,footerMaxWidth:contentMaxWidth,navigationMaxWidth:contentMaxWidth,
    headerVerticalPadding:compactHeight?6:12,
    footerVerticalPadding:compactHeight?6:10,
    navigationVerticalPadding:compactHeight?6:8,
    sectionColumns,columnWidth:sectionColumns===2?possibleColumnWidth:usableWidth,
    stackRows:usableWidth < 360 || effectiveFontScale > 1.3+Number.EPSILON,
    layoutKey:[width,height,effectiveFontScale,sectionColumns].join(':'),
  };
}
