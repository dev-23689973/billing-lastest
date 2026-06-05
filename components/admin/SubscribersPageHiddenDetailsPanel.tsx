import type { ReactNode } from "react";

export type SubscribersPageDetailItem = {
  columnId: string;
  label: string;
  value: ReactNode;
};

function splitDetailPanelColumns(items: SubscribersPageDetailItem[]) {
  const splitAt = Math.ceil(items.length / 2);
  return { left: items.slice(0, splitAt), right: items.slice(splitAt) };
}

function SubscribersPageDetailField({ item }: { item: SubscribersPageDetailItem }) {
  return (
    <div className="subscribers-page-detail-field" data-detail-id={item.columnId}>
      <div className="subscribers-page-detail-item-row">
        <span className="subscribers-page-detail-label">{item.label}</span>
        <span className="subscribers-page-detail-leader" aria-hidden />
        <span className="subscribers-page-detail-value">{item.value}</span>
      </div>
    </div>
  );
}

export function SubscribersPageHiddenDetailsPanel({ items }: { items: SubscribersPageDetailItem[] }) {
  if (items.length === 0) return null;

  const { left, right } = splitDetailPanelColumns(items);

  return (
    <div className="subscribers-page-expand-details-panel" role="region" aria-label="Additional row details">
      <div className="subscribers-page-detail-column">
        {left.map((item) => (
          <SubscribersPageDetailField key={item.columnId} item={item} />
        ))}
      </div>
      {right.length > 0 ? (
        <div className="subscribers-page-detail-column subscribers-page-detail-column--right">
          {right.map((item) => (
            <SubscribersPageDetailField key={item.columnId} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
