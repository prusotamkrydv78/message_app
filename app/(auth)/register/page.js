"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import Card from "../../../components/ui/card";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+977");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.register({ name, countryCode, phoneNumber, password });
      await refreshSession();
      router.replace("/chat");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 grid place-items-center py-8">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto size-10 rounded-lg bg-black mb-2" />
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-gray-500">Join ChatX to start messaging</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Input
              label="Code"
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            />
            <Input
              label="Phone number"
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 9800000000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create account"}
          </Button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Already have an account? <Link className="underline" href="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
