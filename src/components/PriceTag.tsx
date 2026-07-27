interface PriceTagProps {
  priceINR: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_PX: Record<NonNullable<PriceTagProps['size']>, number> = {
  sm: 13,
  md: 15,
  lg: 22,
};

export default function PriceTag({ priceINR, size = 'md' }: PriceTagProps) {
  const formatted = priceINR.toLocaleString('en-IN');
  return (
    <span className="price-tag" style={{ fontSize: SIZE_PX[size] }}>
      ₹{formatted}
    </span>
  );
}
