import type { CSSProperties } from 'react';

type Props = {
  /** Font Awesome 6 글리프 코드. 원본 XAML의 &#xf007; → 0xf007 */
  code: number;
  /** solid = FontAwesomeFontFamily(900), regular = FontAwesomeFontFamily_Reg(400) */
  variant?: 'solid' | 'regular';
  size?: number;
  color?: string;
  style?: CSSProperties;
};

/** 원본과 같은 Font Awesome 6 Free 글꼴 아이콘 */
export function FaIcon({ code, variant = 'solid', size, color, style }: Props) {
  return (
    <span
      aria-hidden
      style={{
        fontFamily: variant === 'solid' ? 'FA6Solid' : 'FA6Regular',
        fontWeight: variant === 'solid' ? 900 : 400,
        fontSize: size,
        color,
        lineHeight: 1,
        display: 'inline-block',
        ...style,
      }}
    >
      {String.fromCodePoint(code)}
    </span>
  );
}
