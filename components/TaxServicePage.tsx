import React, { useState } from 'react';

const TaxServicePage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
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
    const { name, email, country, message } = formData;
    const recipient = 'tax-services@verum-foundation.org'; // Placeholder email
    const subject = `Tax Service Inquiry from ${name}`;
    const body = `
      New Tax Service Inquiry:

      Name: ${name}
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
            Professional Tax Return Services
          </h2>
          <p className="mt-2 text-center text-lg text-blue-600 dark:text-blue-400 font-semibold">
            50% Cheaper Than Your Geographic Local Rate
          </p>
          <p className="mt-4 text-center text-md text-gray-600 dark:text-gray-300">
            Let our experts handle your tax returns with precision and care, at an unbeatable price. Fill out the form below to get started, and our team will contact you shortly.
          </p>
        </div>
        {submitted ? (
            <div className="text-center p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 rounded-md">
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Thank you for your inquiry!</h3>
                <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                    Your email client should now be open with a pre-filled message. Please review and send it to us. We look forward to assisting you.
                </p>
            </div>
        ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="name" className="sr-only">Full Name</label>
                  <input id="name" name="name" type="text" required value={formData.name} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Full Name" />
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
                  <textarea id="message" name="message" rows={4} required value={formData.message} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Briefly describe your tax situation (e.g., personal, small business, etc.)" />
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

export default TaxServicePage;