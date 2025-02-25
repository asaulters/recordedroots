import React, { useState } from 'react';
import { addResident, getResident } from '../services/db';

const NewResidentButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    facility: '',
    residentId: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const checkResidentId = async (id) => {
    try {
      const existingResident = await getResident(id);
      return !existingResident;
    } catch (error) {
      console.error('Error checking resident ID:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.facility || !formData.residentId) {
      setError('All fields are required');
      return;
    }

    const isAvailable = await checkResidentId(formData.residentId);
    if (!isAvailable) {
      setError('This Resident ID is already taken');
      return;
    }

    try {
      await addResident({
        name: formData.name,
        facility: formData.facility,
        residentId: formData.residentId,
        createdAt: new Date().toISOString()
      });

      setFormData({ name: '', facility: '', residentId: '' });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding new resident:', error);
      setError('Failed to create new resident');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        New Resident
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">New Resident</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="facility">
                  Facility
                </label>
                <input
                  type="text"
                  id="facility"
                  name="facility"
                  value={formData.facility}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="residentId">
                  Resident ID
                </label>
                <input
                  type="text"
                  id="residentId"
                  name="residentId"
                  value={formData.residentId}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              {error && (
                <div className="mb-4 text-red-500 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default NewResidentButton;
