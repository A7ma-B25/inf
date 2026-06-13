import logoAsset from "@/assets/boom-logo.png.asset.json";

type Props = { variant?: "light" | "dark"; size?: "sm" | "md" | "lg" };

export function Logo({ size = "md" }: Props) {
  const heights = { sm: 24, md: 34, lg: 48 }[size];
  return (
    <div className="inline-flex items-center">
      <img
        src={logoAsset.url}
        alt="BOOM"
        style={{ height: heights, width: "auto" }}
        draggable={false}
      />
    </div>
  );
}
