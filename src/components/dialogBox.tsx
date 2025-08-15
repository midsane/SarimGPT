import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import Image from "next/image"

export function NotAuthorisedDialogBox({ login, signup }: { login: () => void, signup: () => void }) {
  return (
    <div className="min-h-fit rounded-2xl bg-sidebar flex items-center justify-center p-6">
      <Dialog open={true} >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex justify-start gap-2 items-end mb-4">
              <Image
                width={32}
                height={32}
                className="w-10 aspect-square rounded-md"
                src={"/chatgpt.png"}
                alt="SarimGPT logo"
              />
              <p>SarimGPT</p>
            </DialogTitle>
            <DialogDescription>
              SarimGPT is your AI-powered multimodal companion, designed to assist you with a wide range of tasks and queries.
              Please register or login to use the features of this website.

            </DialogDescription>
          </DialogHeader>
          <Button onClick={login}>Login</Button>

          <Button variant="outline" onClick={signup}>Signup</Button>


        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Controlled example (optional)
// If you need the Dialog to be controlled from parent state, you can use:
//
// const [open, setOpen] = useState(false);
// <Dialog open={open} onOpenChange={setOpen}> ... </Dialog>
//
// This allows you to open/close the dialog programmatically (e.g. after
// submitting a form or from a keyboard shortcut).
