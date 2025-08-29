'use client';

import { useState, useEffect } from 'react';

interface LabTest {
  _id: string;
  code: string;
  name: string;
  price: number;
}

export default function TestManagement() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [testForm, setTestForm] = useState({
    code: '',
    name: '',
    price: ''
  });

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await fetch('/api/tests');
      if (response.ok) {
        const data = await response.json();
        setTests(data.tests || []);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };


  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!testForm.code.trim() || !testForm.name.trim() || !testForm.price) {
      setError('Test code, name, and price are required');
      return;
    }
    
    setLoading(true);

    try {
      const url = editingTest ? `/api/tests/${editingTest._id}` : '/api/tests';
      const method = editingTest ? 'PUT' : 'POST';
      
      const testData = {
        code: testForm.code.trim(),
        name: testForm.name.trim(),
        price: parseFloat(testForm.price)
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        setSuccess(editingTest ? 'Test updated successfully!' : 'Test added successfully!');
        setShowTestModal(false);
        setEditingTest(null);
        resetTestForm();
        fetchTests();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to save test');
      }
    } catch (error) {
      console.error('Error saving test:', error);
      setError('Error saving test');
    } finally {
      setLoading(false);
    }
  };

  const resetTestForm = () => {
    setTestForm({
      code: '',
      name: '',
      price: ''
    });
  };

  const editTest = (test: LabTest) => {
    setEditingTest(test);
    setTestForm({
      code: test.code,
      name: test.name,
      price: test.price.toString()
    });
    setShowTestModal(true);
  };


  const deleteTest = async (test: LabTest) => {
    const confirmDelete = confirm(
      `Are you sure you want to delete "${test.name}" (${test.code})? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
      const response = await fetch(`/api/tests/${test._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Test deleted successfully!');
        fetchTests();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete test');
      }
    } catch (error) {
      console.error('Error deleting test:', error);
      setError('Error deleting test');
    }
  };


  const filteredTests = tests.filter(test => {
    const matchesSearch = 
      (test.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (test.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-6 border-b border-border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Test Management</h3>
            <p className="text-sm text-gray-600">Manage laboratory tests efficiently</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                resetTestForm();
                setEditingTest(null);
                setShowTestModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Test
            </button>
            <button
              onClick={fetchTests}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="px-6 py-6 bg-white/50 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Tests
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                name="search"
                type="text"
                placeholder="Search by test name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 hover:border-gray-300"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Tests Table */}
      <div className="overflow-x-auto bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Test Code
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Test Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredTests.map((test) => (
              <tr key={test._id} className="hover:bg-blue-50/50 transition-colors duration-200">
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm font-mono font-semibold text-gray-900">{test.code}</div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">{test.name}</div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">Rs. {test.price.toLocaleString()}</div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => editTest(test)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTest(test)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transition-all duration-200"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTests.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tests found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria.' : 'No tests have been created yet.'}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">{tests.length}</span> total tests
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Simplified Add/Edit Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  {editingTest ? 'Edit Lab Test' : 'Add New Lab Test'}
                </h3>
                <button
                  onClick={() => {
                    setShowTestModal(false);
                    setEditingTest(null);
                    resetTestForm();
                    setError('');
                  }}
                  className="text-white hover:text-gray-200 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleTestSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Test Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Code *
                  </label>
                  <input
                    type="text"
                    value={testForm.code}
                    onChange={(e) => setTestForm({ ...testForm, code: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="e.g., CBC001"
                    required
                  />
                </div>

                {/* Test Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Name *
                  </label>
                  <input
                    type="text"
                    value={testForm.name}
                    onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="e.g., Complete Blood Count"
                    required
                  />
                </div>

                {/* Price */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={testForm.price}
                    onChange={(e) => setTestForm({ ...testForm, price: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTestModal(false);
                    setEditingTest(null);
                    resetTestForm();
                    setError('');
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </div>
                  ) : (
                    editingTest ? 'Update Test' : 'Add Test'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}