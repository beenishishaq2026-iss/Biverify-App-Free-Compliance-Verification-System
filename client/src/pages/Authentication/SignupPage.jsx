import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth as authApi, saveSession, apiErrorMessage } from '../../api/client';
import api from '../../api/client';
import './SignupPage.css';

const SignupPage = () => {
    const navigate = useNavigate();
    // Role Toggle State
    const [role, setRole] = useState('provider'); // 'provider' or 'client'
    const [currentStep, setCurrentStep] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Validation Error State
    const [errors, setErrors] = useState({});

    // Single formData state capturing fields for both roles
    const [formData, setFormData] = useState({
        // Basic Info 
        fullName: '', email: '', phone: '', password: '', confirmPassword: '',

        // Provider specific
        companyName: '', regNumber: '', providerAddress: '', providerCity: '', providerCountry: '', providerWebsite: '',
        serviceType: '', licenseNumber: '',
        certType: '', expiryDate: '', certificateFile: null,

        // Client specific
        orgName: '', industryType: '', clientAddress: '', clientCity: '', clientCountry: '',
        contactPerson: '', contactRole: '', department: '', clientWebsite: ''
    });

    // Steps definition
    const providerSteps = [
        { title: 'Basic Information', subtitle: 'Personal details of provider' },
        { title: 'Company Details', subtitle: "Company's basic information" },
        { title: 'Service Details', subtitle: 'Services and licensing' },
        { title: 'Compliance', subtitle: 'Certifications and documents' }
    ];

    const clientSteps = [
        { title: 'Basic Information', subtitle: 'Personal details of client' },
        { title: 'Organization Info', subtitle: "Organization's basic info" },
        { title: 'Contact Info', subtitle: 'Primary contact details' }
    ];

    const activeSteps = role === 'provider' ? providerSteps : clientSteps;
    const totalSteps = activeSteps.length;

    // Handle role switch
    const handleRoleToggle = (selectedRole) => {
        if (role === selectedRole) return;
        setRole(selectedRole);
        setCurrentStep(1); // Reset step index smoothly
        setErrors({});
    };

    // Handle input changes
    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: files ? files[0] : value
        }));
        // Clear field-specific error when typed
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    // Basic Validation logic per step
    const validateStep = () => {
        const newErrors = {};
        const step = currentStep;

        // --- STEP 1: Basic Info (Same for both, varied email label) ---
        if (step === 1) {
            if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
            if (!formData.email.trim()) newErrors.email = "Email is required";
            if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
            if (!formData.password) newErrors.password = "Password is required";
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = "Passwords do not match";
            }
        }

        // --- PROVIDER STEPS ---
        if (role === 'provider') {
            if (step === 2) {
                if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
                if (!formData.regNumber.trim()) newErrors.regNumber = "Registration number is required";
                if (!formData.providerAddress.trim()) newErrors.providerAddress = "Address is required";
                if (!formData.providerCity.trim()) newErrors.providerCity = "City is required";
                if (!formData.providerCountry.trim()) newErrors.providerCountry = "Country is required";
            }
            if (step === 3) {
                if (!formData.serviceType) newErrors.serviceType = "Please select a service type";
                if (!formData.licenseNumber.trim()) newErrors.licenseNumber = "License number is required";
            }
            if (step === 4) {
                if (!formData.certType.trim()) newErrors.certType = "Certification type is required";
                if (!formData.expiryDate.trim()) newErrors.expiryDate = "Expiry date is required";
                if (!formData.certificateFile) newErrors.certificateFile = "File upload is required";
            }
        }

        // --- CLIENT STEPS ---
        if (role === 'client') {
            if (step === 2) {
                if (!formData.orgName.trim()) newErrors.orgName = "Organization name is required";
                if (!formData.industryType) newErrors.industryType = "Please select an industry";
                if (!formData.clientAddress.trim()) newErrors.clientAddress = "Address is required";
                if (!formData.clientCity.trim()) newErrors.clientCity = "City is required";
                if (!formData.clientCountry.trim()) newErrors.clientCountry = "Country is required";
            }
            if (step === 3) {
                if (!formData.contactPerson.trim()) newErrors.contactPerson = "Contact person name is required";
                if (!formData.contactRole) newErrors.contactRole = "Please select a role";
                if (!formData.department.trim()) newErrors.department = "Department is required";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep()) {
            triggerTransition(() => setCurrentStep((prev) => Math.min(prev + 1, totalSteps)));
        }
    };

    const handleBack = () => {
        triggerTransition(() => setCurrentStep((prev) => Math.max(prev - 1, 1)));
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;
        try {
            const payload = {
                orgType: role,                 // "provider" | "client"
                orgName: role === 'provider' ? formData.companyName : formData.orgName,
                adminFullName: formData.fullName,
                adminEmail: formData.email,
                phone: formData.phone,
                password: formData.password,
                address: role === 'provider' ? formData.providerAddress : formData.clientAddress,
                city: role === 'provider' ? formData.providerCity : formData.clientCity,
                country: role === 'provider' ? formData.providerCountry : formData.clientCountry,
                industry: formData.industryType || '',
                serviceType: formData.serviceType || '',
            };
            const { data } = await api.post('/api/auth/register-org', payload);
            if (data.pending) {
                // Provider registration is pending admin approval — go to waiting screen
                navigate('/application-submitted', { replace: true, state: { orgName: payload.orgName } });
            } else {
                // Client orgs are auto-approved, save session and enter dashboard
                saveSession(data.token, data.user);
                navigate('/overview', { replace: true });
            }
        } catch (err) {
            console.error('Signup error:', err?.response?.data || err);
            const msg = apiErrorMessage(err);
            setErrors({ submit: msg });
            alert(`Signup failed: ${msg}`);
        }
    };

    const triggerTransition = (callback) => {
        setIsTransitioning(true);
        setTimeout(() => {
            callback();
            setIsTransitioning(false);
        }, 300); // 300ms matches css transition duration
    };

    // --- RENDERING FORM FIELDS ---
    const renderFormFields = () => {
        // Determine which fields to parse based on step and role
        return (
            <div className={`form-step-container ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
                {/* Step Header */}
                <div className="form-header">
                    <span className="signup-step-counter">Step {currentStep}/{totalSteps}</span>
                    <h2 className="signup-step-title">{activeSteps[currentStep - 1].title}</h2>
                    <p className="signup-step-subtitle">{activeSteps[currentStep - 1].subtitle}</p>
                </div>

                {/* --- STEP 1 (Common but labels differ slightly) --- */}
                {currentStep === 1 && (
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Full Name</label>
                            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" />
                            {errors.fullName && <span className="error-text">{errors.fullName}</span>}
                        </div>
                        <div className="form-group full-width">
                            <label>{role === 'client' ? 'Work Email' : 'Email Address'}</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                            {errors.email && <span className="error-text">{errors.email}</span>}
                        </div>
                        <div className="form-group full-width">
                            <label>Phone Number</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 890" />
                            {errors.phone && <span className="error-text">{errors.phone}</span>}
                        </div>
                        <div className="form-group half-width">
                            <label>Password</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
                            {errors.password && <span className="error-text">{errors.password}</span>}
                        </div>
                        <div className="form-group half-width">
                            <label>Confirm Password</label>
                            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" />
                            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                        </div>
                    </div>
                )}

                {/* --- PROVIDER SPECIFIC STEPS --- */}
                {role === 'provider' && currentStep === 2 && (
                    <div className="form-grid">
                        <div className="form-group half-width">
                            <label>Company Name</label>
                            <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} />
                            {errors.companyName && <span className="error-text">{errors.companyName}</span>}
                        </div>
                        <div className="form-group half-width">
                            <label>Registration Number</label>
                            <input type="text" name="regNumber" value={formData.regNumber} onChange={handleChange} />
                            {errors.regNumber && <span className="error-text">{errors.regNumber}</span>}
                        </div>
                        <div className="form-group full-width">
                            <label>Company Address</label>
                            <input type="text" name="providerAddress" value={formData.providerAddress} onChange={handleChange} />
                            {errors.providerAddress && <span className="error-text">{errors.providerAddress}</span>}
                        </div>
                        <div className="form-group half-width">
                            <label>City</label>
                            <input type="text" name="providerCity" value={formData.providerCity} onChange={handleChange} />
                            {errors.providerCity && <span className="error-text">{errors.providerCity}</span>}
                        </div>
                        <div className="form-group half-width">
                            <label>Country</label>
                            <input type="text" name="providerCountry" value={formData.providerCountry} onChange={handleChange} />
                            {errors.providerCountry && <span className="error-text">{errors.providerCountry}</span>}
                        </div>
                        <div className="form-group full-width">
                            <label>Website (Optional)</label>
                            <input type="text" name="providerWebsite" value={formData.providerWebsite} onChange={handleChange} placeholder="https://..." />
                        </div>
                    </div>
                )}

                {role === 'provider' && currentStep === 3 && (
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Service Type</label>
                            <select name="serviceType" value={formData.serviceType} onChange={handleChange}>
                                <option value="">Select Service</option>
                                <option value="Equipment Maintenance">Equipment Maintenance</option>
                                <option value="IT Services">IT Services</option>
                                <option value="Cleaning">Cleaning</option>
                                <option value="Security">Security</option>
                                <option value="Compliance Inspection">Compliance Inspection</option>
                            </select>
                            {errors.serviceType && <span className="error-text">{errors.serviceType}</span>}
                        </div>
                        <div className="form-group full-width">
                            <label>License Number</label>
                            <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} />
                            {errors.licenseNumber && <span className="error-text">{errors.licenseNumber}</span>}
                        </div>
                    </div>
                )}

                {role === 'provider' && currentStep === 4 && (
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Certification Type</label>
                            <input type="text" name="certType" value={formData.certType} onChange={handleChange} placeholder="e.g. ISO 9001" />
                            {errors.certType && <span className="error-text">{errors.certType}</span>}
                        </div>
                        <div className="form-group full-width">
                            <label>Expiry Date</label>
                            <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} />
                            {errors.expiryDate && <span className="error-text">{errors.expiryDate}</span>}
                        </div>
                        <div className="form-group full-width">
                            <label>Upload Certificate (PDF/Image)</label>
                            <input type="file" name="certificateFile" onChange={handleChange} accept=".pdf,image/*" className="file-input" />
                            {errors.certificateFile && <span className="error-text">{errors.certificateFile}</span>}
                        </div>
                    </div>
                )}

                {/* --- CLIENT SPECIFIC STEPS --- */}
                {role === 'client' && currentStep === 2 && (
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Organization Name</label>
                            <input type="text" name="orgName" value={formData.orgName} onChange={handleChange} />
                            {errors.orgName && <span className="error-text">{errors.orgName}</span>}
                        </div>
                        <div className="form-group full-width">
                            <label>Industry Type</label>
                            <select name="industryType" value={formData.industryType} onChange={handleChange}>
                                <option value="">Select Industry</option>
                                <option value="Manufacturing">Manufacturing</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="IT/Tech">IT/Tech</option>
                                <option value="Retail">Retail</option>
                                <option value="Education">Education</option>
                                <option value="Construction">Construction</option>
                            </select>
                            {errors.industryType && <span className="error-text">{errors.industryType}</span>}
                        </div>
                        <div className="form-group full-width">
                            <label>Company Address</label>
                            <input type="text" name="clientAddress" value={formData.clientAddress} onChange={handleChange} />
                            {errors.clientAddress && <span className="error-text">{errors.clientAddress}</span>}
                        </div>
                        <div className="form-group half-width">
                            <label>City</label>
                            <input type="text" name="clientCity" value={formData.clientCity} onChange={handleChange} />
                            {errors.clientCity && <span className="error-text">{errors.clientCity}</span>}
                        </div>
                        <div className="form-group half-width">
                            <label>Country</label>
                            <input type="text" name="clientCountry" value={formData.clientCountry} onChange={handleChange} />
                            {errors.clientCountry && <span className="error-text">{errors.clientCountry}</span>}
                        </div>
                    </div>
                )}

                {role === 'client' && currentStep === 3 && (
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Contact Person Name</label>
                            <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
                            {errors.contactPerson && <span className="error-text">{errors.contactPerson}</span>}
                        </div>
                        <div className="form-group half-width">
                            <label>Role</label>
                            <select name="contactRole" value={formData.contactRole} onChange={handleChange}>
                                <option value="">Select Role</option>
                                <option value="Manager">Manager</option>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Admin">Admin</option>
                            </select>
                            {errors.contactRole && <span className="error-text">{errors.contactRole}</span>}
                        </div>
                        <div className="form-group half-width">
                            <label>Department</label>
                            <input type="text" name="department" value={formData.department} onChange={handleChange} />
                            {errors.department && <span className="error-text">{errors.department}</span>}
                        </div>
                        <div className="form-group full-width">
                            <label>Company Website (Optional)</label>
                            <input type="text" name="clientWebsite" value={formData.clientWebsite} onChange={handleChange} placeholder="https://..." />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Calculate Progress Percentage
    const progressPercentage = ((currentStep) / totalSteps) * 100;

    return (
        <div className="signup-wrapper">
            <div className="signup-container">

                {/* LEFT PANEL - Green Background */}
                <div className="left-panel">
                    <div className="brand-header">
                        <div className="brand-logo">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <h3>Bi-Verify</h3>
                    </div>

                    <div className="signup-step-tracker">
                        {activeSteps.map((step, index) => {
                            const stepNumber = index + 1;
                            const isActive = currentStep === stepNumber;
                            const isCompleted = currentStep > stepNumber;

                            return (
                                <div key={index} className={`signup-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                                    <div className="signup-step-indicator">
                                        <div className="signup-step-circle">
                                            {isCompleted ? '✓' : stepNumber}
                                        </div>
                                        {/* Connecting line to next element */}
                                        {index < activeSteps.length - 1 && <div className="signup-step-line"></div>}
                                    </div>
                                    <div className="signup-step-content">
                                        <h4>{step.title}</h4>
                                        <p>{step.subtitle}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="panel-footer">
                        <p>All rights reserved @Bi-Verify</p>
                    </div>
                </div>

                {/* RIGHT PANEL - White Form Container */}
                <div className="right-panel">
                    {/* Progress Bar Header */}
                    <div className="progress-bar-container">
                        <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
                    </div>

                    {/* Role Toggle Switch */}
                    <div className="role-toggle-wrapper">
                        <span>Register as:</span>
                        <div className="role-toggle">
                            <button
                                className={role === 'provider' ? 'active provider' : ''}
                                onClick={() => handleRoleToggle('provider')}
                            >
                                Provider
                            </button>
                            <button
                                className={role === 'client' ? 'active client' : ''}
                                onClick={() => handleRoleToggle('client')}
                            >
                                Client
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Form Area */}
                    <div className="form-area">
                        {renderFormFields()}
                    </div>

                    {/* Form Action Buttons */}
                    <div className="form-actions">
                        {currentStep > 1 && (
                            <button className="btn-back" onClick={handleBack}>
                                Back
                            </button>
                        )}
                        {currentStep < totalSteps ? (
                            <button className="btn-next" onClick={handleNext}>
                                Next
                            </button>
                        ) : (
                            <button className="btn-submit" onClick={handleSubmit}>
                                Submit & Continue
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;