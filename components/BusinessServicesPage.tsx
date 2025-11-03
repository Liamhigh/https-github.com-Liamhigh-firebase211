import React, { useState } from 'react';

const BusinessServicesPage: React.FC = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    country: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const { companyName, contactName, email, country, message } = formData;
    const recipient = 'business-services@verum-foundation.org'; // Placeholder email
    const subject = `Business Legal Service Inquiry from ${companyName}`;
    const body = `
      New Business & Legal Service Inquiry:

      Company Name: ${companyName}
      Contact Name: ${contactName}
      Email: ${email}
      Country/Region: ${country}

      Message:
      ---
      ${message}
      ---
    `;
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            A Law Firm in Your Pocket
          </h2>
          <p className="mt-2 text-center text-lg text-blue-600 dark:text-blue-400 font-semibold">
            20% of Traditional Legal Fees
          </p>
          <p className="mt-4 text-center text-md text-gray-600 dark:text-gray-300">
            Leverage the world's first triple-verified legal AI for your business. From contract drafting and analysis to full-scale legal support, get elite service with sealed, tamper-proof documentation. Fill out the form below to inquire.
          </p>
        </div>
        {submitted ? (
            <div className="text-center p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 rounded-md">
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Thank you for your inquiry!</h3>
                <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                    Your email client should now be open with a pre-filled message. Please review and send it to our business services team.
                </p>
            </div>
        ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="companyName" className="sr-only">Company Name</label>
                  <input id="companyName" name="companyName" type="text" required value={formData.companyName} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Company Name" />
                </div>
                 <div>
                  <label htmlFor="contactName" className="sr-only">Contact Name</label>
                  <input id="contactName" name="contactName" type="text" required value={formData.contactName} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Contact Name" />
                </div>
                <div>
                  <label htmlFor="email" className="sr-only">Email address</label>
                  <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Email address" />
                </div>
                <div>
                  <label htmlFor="country" className="sr-only">Country / Region</label>
                  <input id="country" name="country" type="text" required value={formData.country} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Country / Region" />
                </div>
                <div>
                  <label htmlFor="message" className="sr-only">Message</label>
                  <textarea id="message" name="message" rows={4} required value={formData.message} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Briefly describe your legal needs (e.g., contract review, document drafting, etc.)" />
                </div>
              </div>

              <div>
                <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Submit Inquiry
                </button>
              </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default BusinessServicesPage;