import type { ReactNode } from "react";

export type StaffHubDetailItem = {
  columnId: string;
  label: string;
  value: ReactNode;
};

function splitDetailPanelColumns(items: StaffHubDetailItem[]) {
  const splitAt = Math.ceil(items.length / 2);
  return { left: items.slice(0, splitAt), right: items.slice(splitAt) };
}

function StaffHubDetailField({ item }: { item: StaffHubDetailItem }) {
  return (
    <div className="staff-hub-detail-field" data-detail-id={item.columnId}>
      <div className="staff-hub-detail-item-row">
        <span className="staff-hub-detail-label">{item.label}</span>
        <span className="staff-hub-detail-leader" aria-hidden />
        <span className="staff-hub-detail-value">{item.value}</span>
      </div>
    </div>
  );
}

export function StaffHubHiddenDetailsPanel({ items }: { items: StaffHubDetailItem[] }) {
  if (items.length === 0) return null;

  const { left, right } = splitDetailPanelColumns(items);

  return (
    <div className="staff-hub-expand-details-panel" role="region" aria-label="Additional row details">
      <div className="staff-hub-detail-column">
        {left.map((item) => (
          <StaffHubDetailField key={item.columnId} item={item} />
        ))}
      </div>
      {right.length > 0 ? (
        <div className="staff-hub-detail-column staff-hub-detail-column--right">
          {right.map((item) => (
            <StaffHubDetailField key={item.columnId} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
