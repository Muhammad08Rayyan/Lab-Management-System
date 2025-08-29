'use client';

import { useState, useEffect } from 'react';

interface TestCategory {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface LabTest {
  _id: string;
  testCode: string;
  testName: string;
  category: TestCategory;
  description: string;
  price: number;
  discountPercent?: number;
  discountValidUntil?: string;
  normalRange: string;
  sampleType: string;
  reportingTime: string;
  instructions: string;
  isActive: boolean;
}

export default function DiscountManagement() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showBulkDiscountModal, setShowBulkDiscountModal] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [bulkDiscountForm, setBulkDiscountForm] = useState({
    discountPercent: '',
    discountValidUntil: '',
    applyToCategory: false,
    categoryId: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchTests();
    fetchCategories();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tests');
      if (response.ok) {
        const data = await response.json();
        setTests(data.tests || []);
      } else {
        setError('Failed to fetch tests');
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      setError('Error fetching tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/test-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories?.filter((cat: TestCategory) => cat.isActive) || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleUpdateDiscount = async (testId: string, discountPercent: number, discountValidUntil?: string) => {
    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountPercent: discountPercent,
          discountValidUntil: discountValidUntil || null
        })
      });

      if (response.ok) {
        fetchTests();
        setSuccess('Discount updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to update discount');
        setTimeout(() => setError(''), 5000);
      }
    } catch (error) {
      console.error('Error updating discount:', error);
      setError('Error updating discount');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleBulkDiscountApply = async () => {
    if (!bulkDiscountForm.discountPercent) {
      setError('Please enter discount percentage');
      return;
    }

    if (parseFloat(bulkDiscountForm.discountPercent) < 0 || parseFloat(bulkDiscountForm.discountPercent) > 100) {
      setError('Discount percentage must be between 0 and 100');
      return;
    }

    setFormLoading(true);
    setError('');
    
    try {
      let testsToUpdate = [];

      if (bulkDiscountForm.applyToCategory && bulkDiscountForm.categoryId) {
        // Apply to entire category
        testsToUpdate = tests.filter(test => test.category._id === bulkDiscountForm.categoryId).map(test => test._id);
      } else {
        // Apply to selected tests
        testsToUpdate = selectedTests;
      }

      if (testsToUpdate.length === 0) {
        setError('Please select tests or a category to apply discount');
        setFormLoading(false);
        return;
      }

      const updatePromises = testsToUpdate.map(testId =>
        fetch(`/api/tests/${testId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discountPercent: parseFloat(bulkDiscountForm.discountPercent),
            discountValidUntil: bulkDiscountForm.discountValidUntil || null
          })
        })
      );

      const results = await Promise.all(updatePromises);
      const failedUpdates = results.filter(result => !result.ok);

      if (failedUpdates.length === 0) {
        setSuccess(`Discount applied to ${testsToUpdate.length} test(s) successfully`);
        fetchTests();
        setShowBulkDiscountModal(false);
        setBulkDiscountForm({
          discountPercent: '',
          discountValidUntil: '',
          applyToCategory: false,
          categoryId: ''
        });
        setSelectedTests([]);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(`Failed to update ${failedUpdates.length} test(s)`);
        setTimeout(() => setError(''), 5000);
      }
    } catch (error) {
      console.error('Error applying bulk discount:', error);
      setError('Error applying bulk discount');
      setTimeout(() => setError(''), 5000);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveDiscount = async (testId: string) => {
    await handleUpdateDiscount(testId, 0, undefined);
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = 
      test.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.testCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.category?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === '' || test.category?._id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const testsWithDiscounts = filteredTests.filter(test => test.discountPercent && test.discountPercent > 0);
  const testsWithoutDiscounts = filteredTests.filter(test => !test.discountPercent || test.discountPercent === 0);

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">Discount Management</h3>
            <p className="text-sm text-muted-foreground">Manage test discounts and promotional offers</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBulkDiscountModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Apply Bulk Discount
            </button>
            <button
              onClick={fetchTests}
              className="px-4 py-2 border border-input bg-background hover:bg-accent rounded-lg transition-colors duration-200 shadow-sm"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
            {success}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{filteredTests.length}</div>
            <div className="text-sm text-gray-600">Total Tests</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{testsWithDiscounts.length}</div>
            <div className="text-sm text-gray-600">With Discounts</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-600">{testsWithoutDiscounts.length}</div>
            <div className="text-sm text-gray-600">Without Discounts</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {testsWithDiscounts.length > 0 
                ? `${(testsWithDiscounts.reduce((sum, test) => sum + (test.discountPercent || 0), 0) / testsWithDiscounts.length).toFixed(1)}%`
                : '0%'
              }
            </div>
            <div className="text-sm text-gray-600">Avg. Discount</div>
          </div>
        </div>
      </div>

      {/* Tests Table */}
      <div className="px-6 py-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tests...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTests(filteredTests.map(test => test._id));
                        } else {
                          setSelectedTests([]);
                        }
                      }}
                      checked={selectedTests.length === filteredTests.length && filteredTests.length > 0}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    Test Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Price & Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredTests.map((test) => (
                  <tr key={test._id} className="hover:bg-blue-50/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTests.includes(test._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTests([...selectedTests, test._id]);
                            } else {
                              setSelectedTests(selectedTests.filter(id => id !== test._id));
                            }
                          }}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <div className="text-sm font-semibold text-foreground">{test.testName}</div>
                          <div className="text-sm text-muted-foreground font-mono">{test.testCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{test.category.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {test.discountPercent && test.discountPercent > 0 ? (
                          <div>
                            <div className="text-xs text-gray-500 line-through">Rs. {test.price.toLocaleString()}</div>
                            <div className="text-sm font-medium text-green-600">
                              Rs. {(test.price - (test.price * test.discountPercent / 100)).toLocaleString()}
                              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                -{test.discountPercent}% OFF
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-foreground">Rs. {test.price.toLocaleString()}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {test.discountValidUntil 
                          ? new Date(test.discountValidUntil).toLocaleDateString()
                          : 'No expiry'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const discount = prompt('Enter discount percentage (0-100):', test.discountPercent?.toString() || '0');
                            if (discount !== null && !isNaN(parseFloat(discount))) {
                              const validUntil = prompt('Enter valid until date (YYYY-MM-DD) or leave empty:', 
                                test.discountValidUntil ? test.discountValidUntil.split('T')[0] : ''
                              );
                              handleUpdateDiscount(test._id, parseFloat(discount), validUntil || undefined);
                            }
                          }}
                          className="inline-flex items-center px-3 py-1 border border-green-300 text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          Edit Discount
                        </button>
                        {test.discountPercent && test.discountPercent > 0 && (
                          <button
                            onClick={() => handleRemoveDiscount(test._id)}
                            className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTests.length === 0 && (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-foreground">No tests found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search criteria.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Discount Modal */}
      {showBulkDiscountModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Apply Bulk Discount</h3>
                <button
                  onClick={() => setShowBulkDiscountModal(false)}
                  className="text-white hover:text-gray-200 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={bulkDiscountForm.discountPercent}
                    onChange={(e) => setBulkDiscountForm({ ...bulkDiscountForm, discountPercent: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., 10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid Until (Optional)
                  </label>
                  <input
                    type="date"
                    value={bulkDiscountForm.discountValidUntil}
                    onChange={(e) => setBulkDiscountForm({ ...bulkDiscountForm, discountValidUntil: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={bulkDiscountForm.applyToCategory}
                      onChange={(e) => setBulkDiscountForm({ ...bulkDiscountForm, applyToCategory: e.target.checked })}
                      className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Apply to entire category</span>
                  </label>
                </div>

                {bulkDiscountForm.applyToCategory && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Category
                    </label>
                    <select
                      value={bulkDiscountForm.categoryId}
                      onChange={(e) => setBulkDiscountForm({ ...bulkDiscountForm, categoryId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Choose a category...</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!bulkDiscountForm.applyToCategory && (
                  <div className="text-sm text-gray-600">
                    Selected {selectedTests.length} test(s) for discount application
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowBulkDiscountModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDiscountApply}
                  disabled={formLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Applying...
                    </div>
                  ) : (
                    'Apply Discount'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}