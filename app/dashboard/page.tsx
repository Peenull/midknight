"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentSnapshot,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

type UserProfile = {
  name?: string;
  email?: string;
  // Add other user fields as needed
};

type ClientRecord = {
  id: string;
  name: string;
  phone: string;
  age: number;
  email: string;
  description: string;
  status: "idle" | "working" | "failed" | "successful";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: any;
  ownerId?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  gender?: string;
  employmentStatus?: string;
};

const CLIENT_STATES: ClientRecord["status"][] = [
  "idle",
  "working",
  "failed",
  "successful",
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [gender, setGender] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<
    ClientRecord["status"] | "all"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(
    null,
  );

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      if (!current) {
        router.push("/");
      } else {
        setUser(current);
        fetchUserProfile(current.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      } else {
        // Fallback to auth user data if no profile document exists
        setUserProfile({
          name: user?.displayName || "Unknown User",
          email: user?.email || "",
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Fallback to auth user data
      setUserProfile({
        name: user?.displayName || "Unknown User",
        email: user?.email || "",
      });
    }
  };

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!user) {
      setClients([]);
      return;
    }
    fetchClients();
  }, [user, sortOrder, currentPage, statusFilter]);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      // Fetch all clients since we need custom sorting by status priority
      const snapshot = await getDocs(collection(db, "clients"));
      let items: ClientRecord[] = snapshot.docs.map((docItem) => {
        const data = docItem.data();
        return {
          id: docItem.id,
          name: (data.name as string) || "",
          phone: (data.phone as string) || "",
          age: (data.age as number) || 0,
          email: (data.email as string) || "",
          description: (data.description as string) || "",
          status: (data.status as ClientRecord["status"]) || "idle",
          createdAt: data.createdAt,
          ownerId: data.ownerId,
        };
      });

      // Filter by status if not "all"
      if (statusFilter !== "all") {
        items = items.filter((client) => client.status === statusFilter);
      }

      // Sort by status priority, then by date
      const statusPriority = { idle: 0, working: 1, failed: 2, successful: 3 };
      items.sort((a, b) => {
        const statusDiff = statusPriority[a.status] - statusPriority[b.status];
        if (statusDiff !== 0) return statusDiff;

        // If same status, sort by date
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return sortOrder === "desc"
          ? dateB.getTime() - dateA.getTime()
          : dateA.getTime() - dateB.getTime();
      });

      // Apply pagination
      const startIndex = (currentPage - 1) * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      const paginatedItems = items.slice(startIndex, endIndex);

      setClients(paginatedItems);
      setHasMore(endIndex < items.length);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setAge("");
    setEmail("");
    setDescription("");
    setAddress("");
    setCity("");
    setState("");
    setPostalCode("");
    setGender("");
    setEmploymentStatus("");
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
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        gender: gender.trim(),
        employmentStatus: employmentStatus.trim(),
        status: "idle",
        createdAt: serverTimestamp(),
      });

      resetForm();
      // Reset to first page and refresh
      setCurrentPage(1);
      setLastDoc(null);
      fetchClients();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.message || "Failed to add client record.");
    }
  };

  const handleUpdateStatus = async (
    id: string,
    status: ClientRecord["status"],
    currentStatus: ClientRecord["status"],
  ) => {
    // Validate status transition
    const isAllowed = isStatusTransitionAllowed(currentStatus, status);
    if (!isAllowed) {
      alert("Invalid status transition. Check the allowed transitions.");
      return;
    }
    await updateDoc(doc(db, "clients", id), { status });
  };

  const isStatusTransitionAllowed = (
    currentStatus: ClientRecord["status"],
    newStatus: ClientRecord["status"],
  ): boolean => {
    if (currentStatus === newStatus) return false; // Can't transition to same status
    if (currentStatus === "idle" && newStatus === "working") return true;
    if (
      currentStatus === "working" &&
      (newStatus === "successful" || newStatus === "failed")
    )
      return true;
    return false; // All other transitions are not allowed
  };

  const getGetAllowedTransitions = (
    currentStatus: ClientRecord["status"],
  ): ClientRecord["status"][] => {
    if (currentStatus === "idle") return ["working"];
    if (currentStatus === "working") return ["successful", "failed"];
    return []; // successful and failed have no allowed transitions
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    await deleteDoc(doc(db, "clients", id));
    setSelectedClient(null);
    fetchClients(); // Refresh current page
  };

  if (loading) {
    return <p className="p-8 text-center">Checking user session...</p>;
  }

  return (
    <div className="min-h-screen px-4 py-8 text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-t from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-6 relative z-10">
        {/* Modern Header */}
        <header className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-6 py-6 shadow-xl">
          <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">
                Dashboard
              </h1>
              <p className="text-sm text-white/60 mt-2">
                Welcome back,{" "}
                <strong className="text-white/90">
                  {userProfile?.name ||
                    user?.displayName ||
                    user?.email ||
                    "User"}
                </strong>
              </p>
              {userProfile?.email && (
                <p className="text-xs text-white/50 mt-1">
                  {userProfile.email}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                auth.signOut();
                router.push("/");
              }}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 hover:bg-red-500/30 hover:border-red-500/50 text-sm font-medium transition-all"
            >
              Sign Out
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-6">Add Client</h2>
          <form
            onSubmit={handleAddClient}
            className="grid gap-4 sm:grid-cols-2"
          >
            {/* Basic Information */}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name *"
              className="col-span-2 sm:col-span-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm"
              required
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm"
            />
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm"
              min={0}
            />

            {/* Gender and Employment Status */}
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm"
            >
              <option value="" className="bg-slate-900">
                Select Gender
              </option>
              <option value="Male" className="bg-slate-900">
                Male
              </option>
              <option value="Female" className="bg-slate-900">
                Female
              </option>
              <option value="Other" className="bg-slate-900">
                Other
              </option>
              <option value="Prefer not to say" className="bg-slate-900">
                Prefer not to say
              </option>
            </select>
            <input
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
              placeholder="Employment Status"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm"
            />
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State/Province"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm"
            />
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Postal Code"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm"
            />

            {/* Description and Notes */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="col-span-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm resize-vertical min-h-[80px]"
            />

            {error ? (
              <p className="col-span-2 text-sm text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-lg p-3">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="col-span-2 rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              Create Client
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Clients</h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {/* Status Filter Tabs */}
              <div className="flex gap-2">
                {["all", ...CLIENT_STATES].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status as ClientRecord["status"] | "all");
                      setCurrentPage(1);
                    }}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      statusFilter === status
                        ? "bg-purple-600 text-white shadow-lg"
                        : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/10"
                    }`}
                  >
                    {status === "all"
                      ? "All"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loadingClients && (
            <p className="text-center text-white/60 py-8">Loading clients...</p>
          )}
          {!clients.length && !loadingClients && (
            <p className="text-center text-white/60 py-8">No clients yet.</p>
          )}

          <div className="space-y-3">
            {clients.map((client) => (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-all hover:border-white/20 group"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-sm text-white/60">
                      {client.email || "no email"} •{" "}
                      {client.phone || "no phone"}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      Age: {client.age}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap ${
                      client.status === "idle"
                        ? "bg-slate-500/30 text-slate-200 border border-slate-500/30"
                        : client.status === "working"
                          ? "bg-blue-500/30 text-blue-200 border border-blue-500/30"
                          : client.status === "failed"
                            ? "bg-red-500/30 text-red-200 border border-red-500/30"
                            : "bg-green-500/30 text-green-200 border border-green-500/30"
                    }`}
                  >
                    {client.status}
                  </span>
                </div>
                {client.description && (
                  <p className="text-xs text-white/50 mt-3 line-clamp-2">
                    {client.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(currentPage - 1);
                  setLastDoc(null);
                }
              }}
              disabled={currentPage === 1 || loadingClients}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white disabled:opacity-50 hover:bg-white/20 border border-white/10 transition-all"
            >
              Previous
            </button>
            <span className="text-center text-sm text-white/60">
              Page {currentPage}
            </span>
            <button
              onClick={() => {
                if (hasMore) {
                  setCurrentPage(currentPage + 1);
                }
              }}
              disabled={!hasMore || loadingClients}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white disabled:opacity-50 hover:bg-white/20 border border-white/10 transition-all"
            >
              Next
            </button>
          </div>
        </section>
      </div>

      {/* Client Details Modal */}
      {selectedClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50 p-3 sm:p-4"
          onClick={() => setSelectedClient(null)}
        >
          <div
            className="w-full max-w-lg sm:max-w-xl md:max-w-2xl rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white break-words">
                {selectedClient.name}
              </h2>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-white/60 hover:text-white text-2xl flex-shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-white/50 mb-2">Email</p>
                  <button
                    onClick={() =>
                      selectedClient.email &&
                      copyToClipboard(selectedClient.email)
                    }
                    className="text-sm text-white hover:text-purple-300 hover:underline break-all text-left transition-colors font-medium"
                    disabled={!selectedClient.email}
                  >
                    {selectedClient.email || "No email"}
                  </button>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-white/50 mb-2">Phone</p>
                  <button
                    onClick={() =>
                      selectedClient.phone &&
                      copyToClipboard(selectedClient.phone)
                    }
                    className="text-sm text-white hover:text-purple-300 hover:underline transition-colors font-medium"
                    disabled={!selectedClient.phone}
                  >
                    {selectedClient.phone || "No phone"}
                  </button>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-white/50 mb-2">Age</p>
                  <p className="text-sm text-white font-medium">
                    {selectedClient.age || "N/A"}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-white/50 mb-2">Gender</p>
                  <p className="text-sm text-white font-medium">
                    {selectedClient.gender || "N/A"}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-white/50 mb-2">Employment</p>
                  <p className="text-sm text-white font-medium">
                    {selectedClient.employmentStatus || "N/A"}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-white/50 mb-2">Owner</p>
                  <p className="text-sm text-white font-medium">
                    {selectedClient.ownerId || "Unknown"}
                  </p>
                </div>
              </div>

              {/* Address Information */}
              {(selectedClient.address ||
                selectedClient.city ||
                selectedClient.state ||
                selectedClient.postalCode) && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-white/70 mb-3 font-semibold">
                    Address
                  </p>
                  <div className="space-y-2">
                    {selectedClient.address && (
                      <p className="text-sm text-white/80">
                        {selectedClient.address}
                      </p>
                    )}
                    {selectedClient.city && (
                      <p className="text-sm text-white/80">
                        {selectedClient.city}
                        {selectedClient.state
                          ? ", " + selectedClient.state
                          : ""}
                      </p>
                    )}
                    {selectedClient.postalCode && (
                      <p className="text-sm text-white/80">
                        {selectedClient.postalCode}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-white/70 mb-3 font-semibold">
                  Description
                </p>
                <p className="text-sm text-white/80 p-4 rounded-lg bg-white/5 border border-white/10 max-h-[150px] overflow-y-auto">
                  {selectedClient.description || "No description"}
                </p>
              </div>

              {/* Status Management */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-sm text-white/70 mb-3 font-semibold">
                  Update Status
                </p>
                {getGetAllowedTransitions(selectedClient.status).length ===
                0 ? (
                  <p className="text-sm text-white/50 italic">
                    This client has reached a final status and cannot be
                    modified.
                  </p>
                ) : (
                  <>
                    <div className="mb-3">
                      {selectedClient.status === "idle" && (
                        <p className="text-xs text-white/50">
                          Only &quot;working&quot; status is allowed from idle.
                        </p>
                      )}
                      {selectedClient.status === "working" && (
                        <p className="text-xs text-white/50">
                          Only &quot;successful&quot; or &quot;failed&quot;
                          statuses are allowed from working.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CLIENT_STATES.map((state) => {
                        const isAllowed = isStatusTransitionAllowed(
                          selectedClient.status,
                          state,
                        );
                        return (
                          <button
                            key={state}
                            onClick={() => {
                              if (isAllowed) {
                                if (
                                  confirm(
                                    `Change status from "${selectedClient.status}" to "${state}"?`,
                                  )
                                ) {
                                  handleUpdateStatus(
                                    selectedClient.id,
                                    state,
                                    selectedClient.status,
                                  );
                                  setSelectedClient({
                                    ...selectedClient,
                                    status: state,
                                  });
                                }
                              }
                            }}
                            disabled={!isAllowed}
                            className={`rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                              selectedClient.status === state
                                ? "bg-purple-600 text-white shadow-lg"
                                : isAllowed
                                  ? "bg-white/15 text-white hover:bg-white/25 border border-white/20 cursor-pointer"
                                  : "bg-white/5 text-white/40 border border-white/10 cursor-not-allowed opacity-50"
                            }`}
                          >
                            {state.charAt(0).toUpperCase() + state.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-between border-t border-white/10 pt-6 mt-6">
              <button
                onClick={() => handleDeleteClient(selectedClient.id)}
                className="rounded-lg bg-red-500/20 border border-red-500/30 px-6 py-2.5 text-sm text-red-200 hover:bg-red-500/30 hover:border-red-500/50 font-medium transition-all active:scale-95"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedClient(null)}
                className="rounded-lg bg-white/10 border border-white/20 px-6 py-2.5 text-sm text-white hover:bg-white/20 hover:border-white/30 font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
