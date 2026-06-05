import { Label } from "@/components/ui/label";

export function ResellerDealerSubscriberMessagesToggle({ enabled }: { enabled: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="srl-edit-dlr-subscriber-msg">Subscriber messages (STB)</Label>
      <div id="srl-edit-dlr-subscriber-msg" className="flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            name="subscriber_messages_manager"
            value="Yes"
            defaultChecked={enabled}
            className="peer sr-only"
          />
          <span className="relative h-7 w-12 rounded-full bg-muted/70 transition-colors duration-200 ease-out after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.22,1,0.36,1)] after:content-[''] peer-checked:bg-emerald-500/85 peer-checked:after:translate-x-5 peer-active:after:scale-[0.96]" />
        </label>
        <span className="text-sm font-medium text-foreground">Allow dealer to send STB messages</span>
      </div>
      <input type="hidden" name="subscriber_messages_manager" value="No" />
      <p className="text-xs text-muted-foreground">When off, this dealer cannot use Messages to Subscribers in the portal.</p>
    </div>
  );
}
