'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal, { ConfirmModal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { FormField, Label, Input, Select, Button, Alert } from '@/components/ui/FormComponents';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'lab_tech' | 'reception' | 'patient' | 'doctor';
  createdAt: string;
}

const ROLE_COLORS = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  lab_tech: 'bg-green-50 text-green-700 border-green-200',
  reception: 'bg-blue-50 text-blue-700 border-blue-200',
  patient: 'bg-purple-50 text-purple-700 border-purple-200',
  doctor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

const ROLE_LABELS = {
  admin: 'Admin',
  lab_tech: 'Lab Tech',
  reception: 'Reception',
  patient: 'Patient',
  doctor: 'Doctor',
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [allUsersCount, setAllUsersCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const usersPerPage = 20;
  const [createFormData, setCreateFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'patient'
  });

  const fetchUsers = useCallback(async (page = currentPage, search = searchTerm, role = filterRole) => {
    try {
      setLoading(true);
      
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: usersPerPage.toString(),
        ...(search && { search }),
        ...(role && { role })
      });
      
      const response = await fetch(`/api/admin/users?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalUsers(data.pagination?.total || 0);
      setAllUsersCount(data.totalUsers || 0);
      setRoleCounts(data.roleCounts || {});
      setCurrentPage(page);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterRole, usersPerPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers(1, searchTerm, filterRole);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchUsers, filterRole]);

  // Filter role change effect
  useEffect(() => {
    fetchUsers(1, searchTerm, filterRole);
  }, [filterRole, fetchUsers, searchTerm]);

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      fetchUsers(); // Refresh the current page
      setError('');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      fetchUsers(); // Refresh to get updated list
      setEditingUser(null);
      setError('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!createFormData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!createFormData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!createFormData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!createFormData.password || createFormData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    if (!createFormData.role) {
      errors.role = 'Please select a role';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setFormLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      await response.json();
      fetchUsers(); // Refresh to get updated list
      setShowCreateForm(false);
      resetForm();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setCreateFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      role: 'patient'
    });
    setFormErrors({});
    setError('');
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    resetForm();
  };

  const handlePageChange = (page: number) => {
    fetchUsers(page, searchTerm, filterRole);
  };

  // Remove client-side filtering since we're doing server-side filtering now

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-muted-foreground">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">User Management</h3>
            <p className="text-sm text-muted-foreground">Manage all system users and control access permissions</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="success"
              className="shadow-lg hover:shadow-xl"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </Button>
            <Button
              onClick={() => fetchUsers()}
              variant="ghost"
              className="border border-input bg-background hover:bg-accent shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-6 bg-card/50 border-b border-border">
        {/* Search Bar */}
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-card-foreground mb-2">Search Users</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Input
              id="search"
              name="search"
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Role Filter Buttons */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-3">Filter by Role</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterRole('')}
              className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filterRole === '' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-muted-foreground hover:bg-gray-200 hover:shadow-sm'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              All Users
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {allUsersCount}
              </span>
            </button>
            
            <button
              onClick={() => setFilterRole('lab_tech')}
              className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filterRole === 'lab_tech'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-sm'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
              </svg>
              Lab Tech
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {roleCounts.lab_tech || 0}
              </span>
            </button>

            <button
              onClick={() => setFilterRole('reception')}
              className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filterRole === 'reception'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Reception
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {roleCounts.reception || 0}
              </span>
            </button>

            <button
              onClick={() => setFilterRole('patient')}
              className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filterRole === 'patient'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 hover:shadow-sm'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Patient
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {roleCounts.patient || 0}
              </span>
            </button>

            <button
              onClick={() => setFilterRole('doctor')}
              className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filterRole === 'doctor'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md'
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:shadow-sm'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Doctor
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {roleCounts.doctor || 0}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={closeCreateForm}
        title="Create New User"
        size="lg"
      >
        <form onSubmit={handleCreateUser}>
          {error && (
            <div className="mb-6">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <ModalBody>
            <div className="grid grid-cols-2 gap-4">
              <FormField error={formErrors.firstName}>
                <Label htmlFor="firstName" required>First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={createFormData.firstName}
                  onChange={(e) => setCreateFormData({...createFormData, firstName: e.target.value})}
                  error={!!formErrors.firstName}
                  placeholder="Enter first name"
                />
              </FormField>
              
              <FormField error={formErrors.lastName}>
                <Label htmlFor="lastName" required>Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={createFormData.lastName}
                  onChange={(e) => setCreateFormData({...createFormData, lastName: e.target.value})}
                  error={!!formErrors.lastName}
                  placeholder="Enter last name"
                />
              </FormField>
            </div>

            <FormField error={formErrors.email}>
              <Label htmlFor="email" required>Email Address</Label>
              <Input
                id="email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData({...createFormData, email: e.target.value})}
                error={!!formErrors.email}
                placeholder="Enter email address"
              />
            </FormField>

            <FormField error={formErrors.phone}>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={createFormData.phone}
                onChange={(e) => setCreateFormData({...createFormData, phone: e.target.value})}
                error={!!formErrors.phone}
                placeholder="Enter phone number"
              />
            </FormField>

            <FormField error={formErrors.password}>
              <Label htmlFor="password" required>Password</Label>
              <Input
                id="password"
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData({...createFormData, password: e.target.value})}
                error={!!formErrors.password}
                placeholder="Enter password (minimum 6 characters)"
              />
            </FormField>

            <FormField error={formErrors.role}>
              <Label htmlFor="role" required>Role</Label>
              <Select
                id="role"
                value={createFormData.role}
                onChange={(e) => setCreateFormData({...createFormData, role: e.target.value})}
                error={!!formErrors.role}
              >
                <option value="">Select a role</option>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="lab_tech">Lab Technician</option>
                <option value="reception">Reception</option>
              </Select>
            </FormField>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeCreateForm}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              loading={formLoading}
              disabled={formLoading}
            >
              Create User
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={
          userToDelete
            ? `Are you sure you want to delete ${userToDelete.firstName} ${userToDelete.lastName}? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
      />

      {/* Users Table */}
      <div className="overflow-x-auto bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                User Information
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Joined Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-accent/50 transition-colors duration-200">
                <td className="px-6 py-5 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    {user.phone && (
                      <div className="text-xs text-muted-foreground/70">{user.phone}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  {editingUser?._id === user._id ? (
                    <div className="flex flex-wrap gap-2">
                      {['lab_tech', 'reception', 'patient', 'doctor'].map((roleOption) => (
                        <button
                          key={roleOption}
                          onClick={() => handleRoleChange(user._id, roleOption)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                            user.role === roleOption
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                          }`}
                        >
                          {ROLE_LABELS[roleOption as keyof typeof ROLE_LABELS]}
                        </button>
                      ))}
                      <button
                        onClick={() => setEditingUser(null)}
                        className="px-2 py-2 text-gray-400 hover:text-muted-foreground hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        title="Cancel"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingUser(user)}
                      className={`inline-flex items-center px-3 py-2 border rounded-[var(--radius-md)] text-xs font-semibold transition-all duration-200 hover:shadow-md hover:scale-105 ${ROLE_COLORS[user.role]}`}
                    >
                      {ROLE_LABELS[user.role]}
                      <svg className="w-3 h-3 ml-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                  <Button
                    onClick={() => handleDeleteUser(user)}
                    variant="destructive"
                    size="sm"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-foreground">No users found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm || filterRole ? 'Try adjusting your search or filter criteria.' : 'No users have been created yet.'}
          </p>
        </div>
      )}


      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-card border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-md text-card-foreground bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-md text-card-foreground bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Showing page <span className="font-medium text-foreground">{currentPage}</span> of{' '}
                  <span className="font-medium text-foreground">{totalPages}</span>
                  {' '}({totalUsers} total users)
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-input bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-card border-input text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-input bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-6 py-4 bg-muted/30 border-t border-border">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{users.length}</span> of <span className="font-semibold text-foreground">{totalUsers}</span> users (from {allUsersCount} total)
              {(searchTerm || filterRole) && <span className="text-blue-600 ml-2">(filtered{searchTerm && ` by "${searchTerm}"`}{filterRole && ` for role "${ROLE_LABELS[filterRole as keyof typeof ROLE_LABELS]}"`})</span>}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}