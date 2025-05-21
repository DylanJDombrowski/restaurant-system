"use client";

import { useCallback, useEffect, useState } from "react";
import { Staff, Restaurant, StaffRole } from "@/lib/types";
import { useAuth } from "@/lib/contexts/auth-context";

/**
 * Staff Management Component
 *
 * This interface allows admins to manage all staff members for their restaurant.
 * It demonstrates several important patterns:
 *
 * 1. Administrative Control: Only admins can create, edit, or deactivate staff
 * 2. Role Management: Admins can assign appropriate roles to staff members
 * 3. Security Integration: Links Supabase Auth with business logic seamlessly
 *
 * Think of this as the HR department's digital filing cabinet - it keeps
 * track of everyone who works at the restaurant and what they're allowed to do.
 */
export default function StaffManagementPage() {
  // State management for the staff list and UI states
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Get current authentication context
  const { restaurant } = useAuth();

  /**
   * Load Staff Data
   *
   * This function fetches all staff members for the current restaurant.
   * Notice how we filter by restaurant_id - this ensures multi-tenancy
   * security (admins only see staff from their own restaurant).
   */
  // Wrap loadStaff in useCallback to prevent unnecessary re-renders
  // and satisfy the exhaustive-deps rule
  const loadStaff = useCallback(async () => {
    if (!restaurant) return; // Guard clause to prevent API calls without restaurant

    try {
      setError(null);

      // Fetch staff for current restaurant only
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
  }, [restaurant]); // restaurant is the only dependency of loadStaff

  /**
   * Effect to load staff data when restaurant becomes available
   *
   * Now that loadStaff is wrapped in useCallback, we can safely
   * include it in the dependency array. This effect will run when:
   * 1. The component mounts
   * 2. The restaurant changes
   * 3. The loadStaff function changes (which only happens when restaurant changes)
   */
  useEffect(() => {
    loadStaff();
  }, [loadStaff]); // Now includes loadStaff as a dependency

  /**
   * Toggle Staff Active Status
   *
   * Instead of deleting staff (which could break order history),
   * we deactivate them. Think of this like suspending an employee
   * ID badge - they can't access the system, but their history remains.
   */
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

      // Update local state to reflect the change immediately
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

  // Loading state with a professional spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading staff members...</div>
      </div>
    );
  }

  // Error state with recovery option
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
      {/* Page Header with Action Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">
            Manage staff accounts for {restaurant?.name}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          + Add Staff Member
        </button>
      </div>

      {/* Staff Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <StaffSummaryCard
          title="Total Staff"
          count={staff.length}
          icon="👥"
          color="blue"
        />
        <StaffSummaryCard
          title="Active Staff"
          count={staff.filter((s) => s.is_active).length}
          icon="✅"
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

      {/* Staff List */}
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
                onToggleStatus={() =>
                  toggleStaffStatus(member.id, member.is_active)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
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
    </div>
  );
}

/**
 * Staff Summary Card Component
 *
 * These cards provide a quick visual overview of staff metrics.
 * They're like a dashboard speedometer - giving admins instant
 * insight into their team composition.
 */
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

/**
 * Staff Member Row Component
 *
 * Each row represents one staff member with their key information
 * and available actions. Notice how we show different visual
 * indicators based on role and status.
 */
function StaffMemberRow({
  staff,
  onEdit,
  onToggleStatus,
}: {
  staff: Staff;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  // Define role colors and badges
  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "staff":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format the creation date for better readability
  const joinedDate = new Date(staff.created_at).toLocaleDateString();

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Staff Avatar (using initials) */}
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            {staff.name.charAt(0).toUpperCase()}
          </div>

          {/* Staff Information */}
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
              <span className="text-sm text-gray-500">
                Joined: {joinedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
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

/**
 * Staff Form Modal Component
 *
 * This modal handles both creating new staff and editing existing staff.
 * It's a perfect example of a reusable component - the same interface
 * serves two purposes based on whether we pass it an existing staff member.
 *
 * The form creates both the Supabase Auth user AND the staff record
 * simultaneously, ensuring they stay in sync.
 */
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
  // Form state management
  const [formData, setFormData] = useState({
    name: staff?.name || "",
    email: staff?.email || "",
    role: staff?.role || "staff",
    // Only show password fields for new staff
    password: "",
    confirmPassword: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if this is an edit operation
  const isEditing = Boolean(staff);

  /**
   * Form Submission Handler
   *
   * This function demonstrates the coordinated creation of both
   * Supabase Auth user and staff record. It's like opening both
   * a bank account and employee file simultaneously.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validation
      if (!formData.name || !formData.email) {
        throw new Error("Name and email are required");
      }

      // For new staff, validate password
      if (!isEditing) {
        if (!formData.password || formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }
      }

      // Prepare request data
      const requestData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        restaurant_id: restaurant.id,
        // Only include password for new staff
        ...(!isEditing && { password: formData.password }),
      };

      // Make API call
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

      // Success! Close the modal and refresh the list
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

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              disabled={isEditing} // Email can't be changed after creation
            />
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed after account creation
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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

          {/* Password Fields (Only for new staff) */}
          {!isEditing && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
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
