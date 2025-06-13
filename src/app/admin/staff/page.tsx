"use client";

import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/lib/contexts/auth-context";
import { Restaurant, Staff, StaffRole } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

/**
 * Enhanced modal dialog for setting a staff member's 6-digit PIN.
 * Supports both custom PIN entry and auto-generation.
 */
function SetPinModal({
  staff,
  onClose,
  onPinSet,
}: {
  staff: Staff | null;
  onClose: () => void;
  onPinSet: () => void;
}) {
  const [pin, setPin] = useState("");
  const [useCustomPin, setUseCustomPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const { session } = useAuth();

  // Don't render anything if no staff member is selected
  if (!staff) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGeneratedPin(null);

    // Validate custom PIN if provided
    if (useCustomPin) {
      if (!/^\d{6}$/.test(pin)) {
        setError("PIN must be exactly 6 digits.");
        return;
      }
    }

    setLoading(true);
    try {
      const requestBody = useCustomPin ? { pin } : {}; // Empty body = generate PIN

      const response = await fetch(`/api/admin/staff/${staff.id}/pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set PIN.");
      }

      const result = await response.json();

      // Show generated PIN to admin (only time it's displayed)
      if (result.data?.method === "generated") {
        setGeneratedPin(result.data.pin);
      } else {
        // Custom PIN was set successfully
        onPinSet();
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratedPinAcknowledged = () => {
    setGeneratedPin(null);
    onPinSet();
    onClose();
  };

  // Show generated PIN display
  if (generatedPin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md m-4">
          <div className="text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              PIN Generated for {staff.name}
            </h2>
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
              <div className="text-sm text-gray-600 mb-2">6-Digit PIN:</div>
              <div className="text-4xl font-mono font-bold text-blue-600 tracking-widest">
                {generatedPin}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <div className="text-sm text-amber-800">
                  <strong>Important:</strong> Write down this PIN immediately.
                  For security reasons, it will not be shown again.
                </div>
              </div>
            </div>
            <button
              onClick={handleGeneratedPinAcknowledged}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 font-medium"
            >
              I&apos;ve Written Down the PIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main PIN setting form
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md m-4">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Set PIN for {staff.name}
        </h2>

        {/* PIN Method Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            PIN Setup Method
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="pinMethod"
                checked={!useCustomPin}
                onChange={() => {
                  setUseCustomPin(false);
                  setPin("");
                  setError("");
                }}
                className="text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-800">
                  Generate Random PIN
                </div>
                <div className="text-sm text-gray-600">
                  System will create a secure 6-digit PIN
                </div>
              </div>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="pinMethod"
                checked={useCustomPin}
                onChange={() => {
                  setUseCustomPin(true);
                  setError("");
                }}
                className="text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-800">Set Custom PIN</div>
                <div className="text-sm text-gray-600">
                  Choose your own 6-digit PIN
                </div>
              </div>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Custom PIN Input */}
          {useCustomPin && (
            <div className="mb-4">
              <label
                htmlFor="pin"
                className="block text-sm font-medium text-gray-900 mb-1"
              >
                6-Digit PIN
              </label>
              <input
                type="password"
                id="pin"
                name="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg font-mono tracking-widest text-center"
                placeholder="••••••"
                autoFocus
                required={useCustomPin}
              />
              <div className="text-xs text-gray-500 mt-1">
                Must be exactly 6 digits (numbers only)
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (useCustomPin && pin.length !== 6)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading
                ? "Setting..."
                : useCustomPin
                ? "Set Custom PIN"
                : "Generate PIN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Staff Management Component with Enhanced PIN Management
 */
export default function StaffManagementPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<Staff | null>(
    null
  );

  const { restaurant } = useAuth();

  const loadStaff = useCallback(async () => {
    if (!restaurant) return;

    try {
      setError(null);
      const response = await fetch(
        `/api/admin/staff?restaurant_id=${restaurant.id}`
      );

      if (!response.ok) {
        throw new Error("Failed to load staff");
      }

      const data = await response.json();
      setStaff(data.data || []);
    } catch (error) {
      console.error("Error loading staff:", error);
      setError(error instanceof Error ? error.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [restaurant]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update staff status");
      }

      setStaff((prev) =>
        prev.map((member) =>
          member.id === staffId
            ? { ...member, is_active: !currentStatus }
            : member
        )
      );
    } catch (error) {
      console.error("Error updating staff status:", error);
      alert("Failed to update staff status");
    }
  };

  const handleRemovePin = async (staffMember: Staff) => {
    if (
      !confirm(
        `Remove PIN for ${staffMember.name}? They will need a new PIN to log in.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/staff/${staffMember.id}/pin`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove PIN");
      }

      // Refresh staff list to update PIN status
      loadStaff();
      alert(`PIN removed successfully for ${staffMember.name}`);
    } catch (error) {
      console.error("Error removing PIN:", error);
      alert(error instanceof Error ? error.message : "Failed to remove PIN");
    }
  };

  const handleSetPinClick = (staffMember: Staff) => {
    setSelectedStaffForPin(staffMember);
    setIsPinModalOpen(true);
  };

  if (loading) {
    <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-600 text-lg font-semibold mb-4">
          Error Loading Staff
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadStaff}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">
            Manage staff accounts and 6-digit PINs for {restaurant?.name}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          + Add Staff Member
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <StaffSummaryCard
          title="Total Staff"
          count={staff.length}
          icon="👥"
          color="blue"
        />
        <StaffSummaryCard
          title="With PINs Set"
          count={staff.filter((s) => s.pin_hash).length}
          icon="🔐"
          color="green"
        />
        <StaffSummaryCard
          title="Managers & Admins"
          count={
            staff.filter((s) => s.role === "manager" || s.role === "admin")
              .length
          }
          icon="👨‍💼"
          color="purple"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
        </div>

        {staff.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mt-2">
              No staff members yet
            </h3>
            <p className="text-gray-600 mt-1">
              Add your first staff member to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {staff.map((member) => (
              <StaffMemberRow
                key={member.id}
                staff={member}
                onEdit={() => setEditingStaff(member)}
                onSetPin={() => handleSetPinClick(member)}
                onRemovePin={() => handleRemovePin(member)}
                onToggleStatus={() =>
                  toggleStaffStatus(member.id, member.is_active)
                }
              />
            ))}
          </div>
        )}
      </div>

      {(showCreateForm || editingStaff) && (
        <StaffFormModal
          staff={editingStaff}
          restaurant={restaurant!}
          onClose={() => {
            setShowCreateForm(false);
            setEditingStaff(null);
          }}
          onSave={() => {
            loadStaff();
            setShowCreateForm(false);
            setEditingStaff(null);
          }}
        />
      )}

      {isPinModalOpen && (
        <SetPinModal
          staff={selectedStaffForPin}
          onClose={() => {
            setIsPinModalOpen(false);
            setSelectedStaffForPin(null);
          }}
          onPinSet={() => {
            loadStaff();
            setIsPinModalOpen(false);
            setSelectedStaffForPin(null);
          }}
        />
      )}
    </div>
  );
}

function StaffSummaryCard({
  title,
  count,
  icon,
  color,
}: {
  title: string;
  count: number;
  icon: string;
  color: "blue" | "green" | "purple";
}) {
  const colorClasses = {
    blue: "border-blue-500 bg-blue-50",
    green: "border-green-500 bg-green-50",
    purple: "border-purple-500 bg-purple-50",
  };

  return (
    <div
      className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{count}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function StaffMemberRow({
  staff,
  onEdit,
  onSetPin,
  onToggleStatus,
}: {
  staff: Staff;
  onEdit: () => void;
  onSetPin: () => void;
  onRemovePin: () => void;
  onToggleStatus: () => void;
}) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const joinedDate = new Date(staff.created_at).toLocaleDateString();

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {staff.name}
              {!staff.is_active && (
                <span className="ml-2 text-sm text-red-600">(Inactive)</span>
              )}
            </h3>
            <p className="text-gray-600">{staff.email}</p>
            <div className="flex items-center space-x-3 mt-1">
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(
                  staff.role
                )}`}
              >
                {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
              </span>
              {staff.pin ? (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  PIN Set
                </span>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  No PIN
                </span>
              )}
              <span className="text-sm text-gray-500">
                Joined: {joinedDate}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onSetPin}
            className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-sm font-medium hover:bg-purple-200 transition-colors"
          >
            Set PIN
          </button>
          <button
            onClick={onEdit}
            className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onToggleStatus}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              staff.is_active
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            {staff.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StaffFormModal({
  staff,
  restaurant,
  onClose,
  onSave,
}: {
  staff: Staff | null;
  restaurant: Restaurant;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: staff?.name || "",
    email: staff?.email || "",
    role: staff?.role || "staff",
    password: "",
    confirmPassword: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(staff);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!formData.name || !formData.email) {
        throw new Error("Name and email are required");
      }

      if (!isEditing) {
        if (!formData.password || formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }
      }

      const requestData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        restaurant_id: restaurant.id,
        ...(!isEditing && { password: formData.password }),
      };

      const endpoint = isEditing
        ? `/api/admin/staff/${staff!.id}`
        : "/api/admin/staff";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to ${isEditing ? "update" : "create"} staff member`
        );
      }

      onSave();
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {isEditing ? "Edit Staff Member" : "Add New Staff Member"}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="john@pizzamia.com"
              disabled={isEditing}
            />
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed after account creation
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  role: e.target.value as StaffRole,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Staff: Basic operations • Manager: Menu management • Admin: Full
              access
            </p>
          </div>

          {!isEditing && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 6 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-900 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {saving ? "Saving..." : isEditing ? "Update" : "Create"} Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
