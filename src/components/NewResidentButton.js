import React, { useState } from 'react';
import { addResident, getResident } from '../services/db';
import './NewResidentButton.css';

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
      [name]: name === 'residentId' ? value.toUpperCase() : value
    }));
  };

  const checkResidentId = async (id) => {
    try {
      // Convert to uppercase when checking
      const existingResident = await getResident(id.toUpperCase());
      console.log('Checking resident ID:', id.toUpperCase(), 'Result:', existingResident);
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
        residentId: formData.residentId.toUpperCase(), // Ensure ID is uppercase when stored
        createdAt: new Date().toISOString()
      });

      // Log success for debugging
      console.log('Successfully created resident:', formData.residentId.toUpperCase());

      setFormData({ name: '', facility: '', residentId: '' });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding new resident:', error);
      setError('Failed to create new resident');
    }
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        New Resident
      </button>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>New Resident</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="facility">Facility</label>
                <input
                  type="text"
                  id="facility"
                  name="facility"
                  value={formData.facility}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="residentId">Resident ID</label>
                <input
                  type="text"
                  id="residentId"
                  name="residentId"
                  value={formData.residentId}
                  onChange={handleInputChange}
                />
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="button-group">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="create-button"
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
