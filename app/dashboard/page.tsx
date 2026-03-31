"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

type ClientRecord = {
  id: string;
  name: string;
  phone: string;
  age: number;
  email: string;
  description: string;
  status: "working" | "failed" | "successful";
  createdAt: any;
};

const CLIENT_STATES: ClientRecord["status"][] = ["working", "failed", "successful"];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      if (!current) {
        router.push("/");
      } else {
        setUser(current);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) {
      setClients([]);
      return;
    }

    const q = query(
      collection(db, "clients"),
      orderBy("createdAt", "desc"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ClientRecord[] = snapshot.docs.map((docItem) => {
        const data = docItem.data();
        return {
          id: docItem.id,
          name: (data.name as string) || "",
          phone: (data.phone as string) || "",
          age: (data.age as number) || 0,
          email: (data.email as string) || "",
          description: (data.description as string) || "",
          status: (data.status as ClientRecord["status"]) || "working",
          createdAt: data.createdAt,
        };
      });
      setClients(items);
    });

    return () => unsubscribe();
  }, [user]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setAge("");
    setEmail("");
    setDescription("");
    setError("");
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Client name is required.");
      return;
    }

    try {
      await addDoc(collection(db, "clients"), {
        ownerId: user?.uid,
        name: name.trim(),
        phone: phone.trim(),
        age: Number(age) || 0,
        email: email.trim(),
        description: description.trim(),
        status: "working",
        createdAt: serverTimestamp(),
      });

      resetForm();
    } catch (err: any) {
      setError(err?.message || "Failed to add client record.");
    }
  };

  const handleUpdateStatus = async (id: string, status: ClientRecord["status"]) => {
    await updateDoc(doc(db, "clients", id), { status });
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    await deleteDoc(doc(db, "clients", id));
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  const stats = useMemo(() => {
    const summary = { working: 0, failed: 0, successful: 0 };
    clients.forEach((c) => {
      summary[c.status] += 1;
    });
    return summary;
  }, [clients]);

  if (loading) {
    return <p className="p-8 text-center">Checking user session...</p>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex items-center justify-between rounded-xl bg-white px-6 py-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">midKnight Dashboard</h1>
            <p className="text-sm text-zinc-600">Signed in as <strong>{user?.email}</strong></p>
          </div>
          <button onClick={handleSignOut} className="rounded-lg bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700">
            Sign Out
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-600">Working</p>
            <p className="text-3xl font-bold">{stats.working}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-600">Failed</p>
            <p className="text-3xl font-bold">{stats.failed}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-600">Successful</p>
            <p className="text-3xl font-bold">{stats.successful}</p>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Add / Update Client</h2>
          <form onSubmit={handleAddClient} className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded-lg border border-zinc-300 p-2"
              required
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="rounded-lg border border-zinc-300 p-2"
            />
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
              className="rounded-lg border border-zinc-300 p-2"
              min={0}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-lg border border-zinc-300 p-2"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="col-span-2 rounded-lg border border-zinc-300 p-2"
            />

            {error ? <p className="col-span-2 text-sm text-rose-600">{error}</p> : null}

            <button type="submit" className="col-span-2 rounded-lg bg-indigo-600 py-2 text-white hover:bg-indigo-700">
              Create Client
            </button>
          </form>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Client List</h2>
          {!clients.length && <p className="mt-3 text-sm text-zinc-500">No clients yet.</p>}

          <div className="mt-4 space-y-4">
            {clients.map((client) => (
              <div key={client.id} className="rounded-lg border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{client.name}</h3>
                    <p className="text-sm text-zinc-600">{client.email || "no email"} • {client.phone || "no phone"}</p>
                    <p className="text-sm text-zinc-600">Age: {client.age}</p>
                    <p className="mt-2 text-sm text-zinc-700">{client.description || "No description"}</p>
                  </div>
                  <button onClick={() => handleDeleteClient(client.id)} className="rounded bg-rose-500 px-3 py-1 text-white hover:bg-rose-600">
                    Delete
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {CLIENT_STATES.map((state) => (
                    <button
                      key={state}
                      onClick={() => handleUpdateStatus(client.id, state)}
                      className={`rounded px-2 py-1 text-xs font-semibold ${client.status === state ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
                    >
                      {state}
                    </button>
                  ))}
                  <span className="ml-auto text-xs font-semibold uppercase text-zinc-500">Current: {client.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
