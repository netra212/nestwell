"use client";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
export function VoicePermissionHelp() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="mt-2 rounded text-xs font-medium text-primary underline underline-offset-4"
          />
        }
      >
        How to enable
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Enable microphone access</DialogTitle>
        <DialogDescription>
          You can always type your search instead.
        </DialogDescription>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
          <li>Open this site over HTTPS or on localhost.</li>
          <li>
            In Chrome or Edge, open the site controls icon next to the address,
            then set Microphone to Allow. In Safari, check Safari Settings →
            Websites → Microphone.
          </li>
          <li>
            Check your device’s privacy settings allow the browser to use the
            microphone. Choose a connected microphone if more than one is
            available.
          </li>
          <li>
            Reload this page and select the microphone again. If a managed
            device blocks access, contact your administrator.
          </li>
        </ol>
        <DialogClose
          render={
            <button
              type="button"
              className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            />
          }
        >
          Got it
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
