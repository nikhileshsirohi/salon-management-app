type NoticeProps = {
  kind?: "info" | "success" | "error";
  children: React.ReactNode;
};

export function Notice({ kind = "info", children }: NoticeProps) {
  return <div className={`notice notice-${kind}`}>{children}</div>;
}
