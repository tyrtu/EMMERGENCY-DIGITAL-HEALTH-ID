import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { WavingHand, Edit, LocalHospital, Lock, CheckCircle, Warning, Celebration, Info } from '@mui/icons-material';
import './WelcomeSetup.css';

const WelcomeSetup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, role } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!loading && (!user || role !== 'patient')) {
      navigate('/login');
    }
  }, [user, loading, role, navigate]);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    basicInfo: {
      fullName: user?.user_metadata?.full_name || '',
      dob: '',
      age: '',
      gender: '',
      height: '',
      bloodGroup: 'Unknown',
      nationalId: '',
      contact: {
        email: user?.email || '',
        phone: ''
      },
      address: {
        street: '',
        city: '',
        county: '',
        country: 'Kenya'
      },
      occupation: '',
      maritalStatus: 'Single'
    }
  });

  const steps = [
    { number: 1, title: 'Welcome', description: 'Get started' },
    { number: 2, title: 'Personal Info', description: 'Your details' },
    { number: 3, title: 'Complete', description: 'All done!' }
  ];

  const validatePhone = (phone) => {
    if (!phone) return true;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const validateEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 2:
        if (!formData.basicInfo.fullName || formData.basicInfo.fullName.trim().length < 2) {
          newErrors.fullName = 'Full name is required (minimum 2 characters)';
        }
        if (!formData.basicInfo.gender) {
          newErrors.gender = 'Gender is required';
        }
        if (!formData.basicInfo.contact?.email || !validateEmail(formData.basicInfo.contact.email)) {
          newErrors.email = 'A valid email address is required';
        }
        if (!formData.basicInfo.contact?.phone || !validatePhone(formData.basicInfo.contact.phone)) {
          newErrors.phone = 'A valid phone number is required (minimum 10 digits)';
        }
        if (formData.basicInfo.dob) {
          const dobDate = new Date(formData.basicInfo.dob);
          const today = new Date();
          if (dobDate > today) {
            newErrors.dob = 'Date of birth cannot be in the future';
          }
        }
        break;

      default:
        break;
    }

    return newErrors;
  };

  const handleInputChange = (field, value) => {
    const fieldPath = field.split('.');
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      let current = newData;
      for (let i = 0; i < fieldPath.length - 1; i++) {
        current = current[fieldPath[i]];
      }
      current[fieldPath[fieldPath.length - 1]] = value;
      return newData;
    });

    setTouchedFields(prev => ({
      ...prev,
      [field]: true
    }));

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field) => {
    setTouchedFields(prev => ({
      ...prev,
      [field]: true
    }));

    const stepErrors = validateStep(currentStep);
    if (stepErrors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: stepErrors[field]
      }));
    }
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      Object.keys(stepErrors).forEach(field => {
        setTouchedFields(prev => ({
          ...prev,
          [field]: true
        }));
      });
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitError(null);
      setSubmitSuccess(null);
      setIsSubmitting(true);

      const payload = {
        authId: user?.id,
        email: formData.basicInfo.contact?.email || user?.email,
        basicInfo: {
          fullName: formData.basicInfo.fullName.trim(),
          dob: formData.basicInfo.dob || undefined,
          age: formData.basicInfo.age || undefined,
          gender: formData.basicInfo.gender || 'Other',
          height: formData.basicInfo.height ? parseFloat(formData.basicInfo.height) : undefined,
          bloodGroup: formData.basicInfo.bloodGroup || 'Unknown',
          nationalId: formData.basicInfo.nationalId || undefined,
          contact: {
            email: formData.basicInfo.contact?.email || user?.email,
            phone: formData.basicInfo.contact?.phone || ''
          },
          address: {
            street: formData.basicInfo.address?.street || undefined,
            city: formData.basicInfo.address?.city || undefined,
            county: formData.basicInfo.address?.county || undefined,
            country: formData.basicInfo.address?.country || 'Kenya'
          },
          occupation: formData.basicInfo.occupation || undefined,
          maritalStatus: formData.basicInfo.maritalStatus || 'Single'
        },
        medicalInfo: {
        },
        emergencyInfo: {
        },
        profileStatus: 'basic_info_complete'
      };

      const { default: apiClient } = await import('../config/apiClient');
      await apiClient.post('/api/patients', payload, { authId: user?.id });

      setSubmitSuccess('Profile saved successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setSubmitError(error.message || 'Failed to save your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content welcome-step">
            <div className="welcome-hero">
              <div className="hero-icon">
                <WavingHand style={{ fontSize: '64px', color: '#3b82f6' }} />
              </div>
              <h2>Welcome to HealthConnect</h2>
              <p className="hero-subtitle">
                Let's set up your basic profile information. Medical details will be completed by healthcare professionals for safety and accuracy.
              </p>
              
              <div className="setup-info">
                <div className="info-item">
                  <span className="info-icon">
                    <Edit style={{ fontSize: '32px', color: '#3b82f6' }} />
                  </span>
                  <div>
                    <h4>Basic Information Only</h4>
                    <p>We'll collect your personal details for identification</p>
                  </div>
                </div>
                
                <div className="info-item">
                  <span className="info-icon">
                    <LocalHospital style={{ fontSize: '32px', color: '#3b82f6' }} />
                  </span>
                  <div>
                    <h4>Medical Info by Professionals</h4>
                    <p>Healthcare providers will complete your medical profile for accuracy</p>
                  </div>
                </div>
                
                <div className="info-item">
                  <span className="info-icon">
                    <Lock style={{ fontSize: '32px', color: '#3b82f6' }} />
                  </span>
                  <div>
                    <h4>Secure & Private</h4>
                    <p>Your information is protected and confidential</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <div className="form-section">
              <h3>Personal Information</h3>
              <p className="section-description">
                Provide your basic details for identification. Medical information will be added by healthcare professionals.
              </p>
              
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="fullName">Full Name *</label>
                  <input
                    id="fullName"
                    type="text"
                    value={formData.basicInfo.fullName}
                    onChange={(e) => handleInputChange('basicInfo.fullName', e.target.value)}
                    onBlur={() => handleBlur('fullName')}
                    className={errors.fullName ? 'error' : ''}
                    placeholder="Enter your full name"
                  />
                  {errors.fullName && <span className="error-text">{errors.fullName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="gender">Gender *</label>
                  <select
                    id="gender"
                    value={formData.basicInfo.gender}
                    onChange={(e) => handleInputChange('basicInfo.gender', e.target.value)}
                    onBlur={() => handleBlur('gender')}
                    className={errors.gender ? 'error' : ''}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && <span className="error-text">{errors.gender}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="dob">Date of Birth</label>
                  <input
                    id="dob"
                    type="date"
                    value={formData.basicInfo.dob}
                    onChange={(e) => handleInputChange('basicInfo.dob', e.target.value)}
                    onBlur={() => handleBlur('dob')}
                    className={errors.dob ? 'error' : ''}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.dob && <span className="error-text">{errors.dob}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="age">Age</label>
                  <input
                    id="age"
                    type="number"
                    min="0"
                    max="150"
                    value={formData.basicInfo.age}
                    onChange={(e) => handleInputChange('basicInfo.age', e.target.value)}
                    placeholder="Your age"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bloodGroup">Blood Group</label>
                  <select
                    id="bloodGroup"
                    value={formData.basicInfo.bloodGroup}
                    onChange={(e) => handleInputChange('basicInfo.bloodGroup', e.target.value)}
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="height">Height (cm)</label>
                  <input
                    id="height"
                    type="number"
                    min="50"
                    max="250"
                    value={formData.basicInfo.height}
                    onChange={(e) => handleInputChange('basicInfo.height', e.target.value)}
                    placeholder="Height in centimeters"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="nationalId">National ID</label>
                  <input
                    id="nationalId"
                    type="text"
                    value={formData.basicInfo.nationalId}
                    onChange={(e) => handleInputChange('basicInfo.nationalId', e.target.value)}
                    placeholder="National identification number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="occupation">Occupation</label>
                  <input
                    id="occupation"
                    type="text"
                    value={formData.basicInfo.occupation}
                    onChange={(e) => handleInputChange('basicInfo.occupation', e.target.value)}
                    placeholder="Your profession"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="maritalStatus">Marital Status</label>
                  <select
                    id="maritalStatus"
                    value={formData.basicInfo.maritalStatus}
                    onChange={(e) => handleInputChange('basicInfo.maritalStatus', e.target.value)}
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.basicInfo.contact?.email}
                    onChange={(e) => handleInputChange('basicInfo.contact.email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={errors.email ? 'error' : ''}
                    placeholder="your@email.com"
                    required
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.basicInfo.contact?.phone}
                    onChange={(e) => handleInputChange('basicInfo.contact.phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    className={errors.phone ? 'error' : ''}
                    placeholder="+254 XXX XXX XXX"
                    required
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="street">Street Address</label>
                  <input
                    id="street"
                    type="text"
                    value={formData.basicInfo.address?.street}
                    onChange={(e) => handleInputChange('basicInfo.address.street', e.target.value)}
                    placeholder="Street and building"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    type="text"
                    value={formData.basicInfo.address?.city}
                    onChange={(e) => handleInputChange('basicInfo.address.city', e.target.value)}
                    placeholder="City"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="county">County</label>
                  <input
                    id="county"
                    type="text"
                    value={formData.basicInfo.address?.county}
                    onChange={(e) => handleInputChange('basicInfo.address.county', e.target.value)}
                    placeholder="County"
                  />
                </div>
              </div>

              <div className="form-note">
                <p>
                  <Info style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle', color: '#0369a1' }} />
                  <strong>Note:</strong> Medical information like blood group, allergies, medications, and emergency contacts will be added by healthcare professionals during your visits for safety and accuracy.
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content completion-step">
            <div className="completion-hero">
              <div className="success-icon">
                <CheckCircle style={{ fontSize: '64px', color: '#10b981' }} />
              </div>
              <h2>Profile Complete!</h2>
              <p className="success-subtitle">
                Your basic profile is ready. Medical details will be added by healthcare providers during your visits.
              </p>
              
              {submitSuccess && (
                <div className="success-banner">
                  <span className="success-icon">
                    <Celebration style={{ fontSize: '24px', color: '#10b981' }} />
                  </span>
                  <p>{submitSuccess}</p>
                </div>
              )}

              {submitError && (
                <div className="error-banner">
                  <span className="error-icon">
                    <Warning style={{ fontSize: '24px', color: '#ef4444' }} />
                  </span>
                  <p>{submitError}</p>
                  <button 
                    onClick={handleSubmit}
                    className="btn btn-retry"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Retrying...' : 'Try Again'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="welcome-setup-container">
      <div className="setup-header">
        <h1>Health Profile Setup</h1>
        <div className="progress-indicator">
          Step {currentStep} of {steps.length}
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
        <div className="progress-steps">
          {steps.map((step) => (
            <div 
              key={step.number}
              className={`progress-step ${currentStep >= step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
            >
              <div className="step-circle">
                {currentStep > step.number ? '✓' : step.number}
              </div>
              <div className="step-label">
                <span className="step-name">{step.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="content-card">{renderStep()}</div>

      <div className="navigation-bar">
        <div className="nav-left">
          {currentStep > 1 && currentStep < 3 && (
            <button 
              onClick={handleBack}
              className="btn btn-back"
              disabled={loading}
            >
              ← Back
            </button>
          )}
        </div>
        
        <div className="nav-right">
          {currentStep < 3 ? (
            <button 
              onClick={handleNext}
              className="btn btn-continue"
              disabled={loading}
            >
              Continue →
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              className="btn btn-complete"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Go to Dashboard →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeSetup;