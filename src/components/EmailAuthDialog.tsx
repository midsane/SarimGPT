// components/EmailAuthDialog.tsx
"use client"
import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"



interface EmailAuthDialogProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
}

export function EmailAuthDialog({ onSignIn, onSignUp, onGoogleSignIn }: EmailAuthDialogProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState<"email" | "google" | false>(false);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading("email")
    await onSignIn(email, password)
    setLoading(false)
  }

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading("email")
    await onSignUp(email, password)
    setLoading(false)
  }

  const handleGoogleClick = async () => {
    setLoading("google");
    await onGoogleSignIn();
    // No need to setLoading(false) here as the page will redirect
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center w-full flex justify-center items-center">
          <Image
            alt="SarimGPT"
            width={30}
            height={30}
            className="w-10 rounded-sm" src="/SarimGPT.png" />
          <DialogTitle className="text-2xl font-bold tracking-tight">Welcome To SarimGPT</DialogTitle>
          <DialogDescription>
            Choose your preferred sign-in method below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Button variant="outline" type="button" onClick={handleGoogleClick} disabled={!!loading}>
            {loading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Image
            width={10}
            height={10}
            alt="Google Auth"
            className="w-5" src={"/icons8-google.svg"} />}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={handleSignInSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-signin">Email</Label>
                  <Input id="email-signin" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password-signin">Password</Label>
                  <Input id="password-signin" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading === 'email'}>
                {loading === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignUpSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input id="email-signup" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading === 'email'}>
                {loading === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}