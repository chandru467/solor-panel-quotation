
'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import logo from "../images/solar-logo.jpeg";

interface FormData {
  projectType: string;
  systemType: string;
  capacity: number;
  location: string;
  batteryOption: string;
  monitoring: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  timeline: string;
}

interface Estimate {
  project: string;
  cap: number;
  system: string;
  battery: string;
  monitoring: string;
  base: number;
  batteryCost: number;
  monitorCost: number;
  subsidy: number;
  gross: number;
  net: number;
  annualGeneration: number;
  co2: number;
}

export function SolarQuotationSystem() {
  const [currentStep, setCurrentStep] = useState(1);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const quoteCardRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<FormData>({
    projectType: 'residential',
    systemType: 'ongrid',
    capacity: 3,
    location: '',
    batteryOption: 'none',
    monitoring: 'no',
    customerName: '',
    customerMobile: '',
    customerEmail: '',
    timeline: 'Within 1 month',
  });

  const pricing = {
    residential: { perKw: 60000 },
    commercial: { perKw: 55000 },
    industrial: { perKw: 50000 },
    battery: { small: 35000, medium: 80000, large: 150000 },
    monitoring: 8000
  } as const;

  const updateFormData = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const computeEstimate = (): Estimate => {
    const projectPricing = pricing[formData.projectType as keyof Omit<typeof pricing, 'battery' | 'monitoring'>];
    const base = (projectPricing as { perKw: number }).perKw * formData.capacity;

    let adjustedBase = base;
    if (formData.systemType === 'offgrid') adjustedBase *= 1.18;
    if (formData.systemType === 'hybrid') adjustedBase *= 1.10;

    const batteryCost = formData.batteryOption !== 'none'
      ? pricing.battery[formData.batteryOption as keyof typeof pricing.battery]
      : 0;

    const monitorCost = formData.monitoring === 'yes' ? pricing.monitoring : 0;

    let subsidy = 0;
    if (formData.projectType === 'residential' && formData.systemType === 'ongrid') {
      subsidy = Math.min(0.2 * adjustedBase, 90000);
    }

    const gross = adjustedBase + batteryCost + monitorCost;
    const net = Math.max(0, gross - subsidy);

    const annualGeneration = formData.capacity * 1200;
    const co2 = (annualGeneration * 0.82) / 1000;

    return {
      project: formData.projectType,
      cap: formData.capacity,
      system: formData.systemType,
      battery: formData.batteryOption,
      monitoring: formData.monitoring,
      base: adjustedBase,
      batteryCost,
      monitorCost,
      subsidy,
      gross,
      net,
      annualGeneration,
      co2
    };
  };

  useEffect(() => {
    setEstimate(computeEstimate());
  }, [formData.projectType, formData.systemType, formData.capacity, formData.batteryOption, formData.monitoring]);

  const currency = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const downloadPDF = async () => {
    if (!estimate) {
      alert('Please generate a quote first before downloading.');
      return;
    }

    try {
      // Create the PDF directly
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const name = (formData.customerName || 'quote').replace(/\s+/g, '_');

      // Add Solar Captures logo - use imported image
      pdf.addImage(logo.src, "JPEG", 15, 8, 40, 35);

      // Reset text color for main content
      pdf.setTextColor(0, 0, 0);

      // Company name (top middle) - moved right to accommodate larger logo
      pdf.setFontSize(24);
      pdf.text('SOLAR CAPTURES', 60, 22);
      pdf.setFontSize(16);
      pdf.text('Instant Quotation', 60, 29);

      // Date (top right)
      const currentDate = new Date().toLocaleDateString('en-US');
      pdf.setFontSize(12);
      pdf.text(`Date: ${currentDate}`, 160, 19);

      // Add separator line
      pdf.setLineWidth(1);
      pdf.line(15, 48, 190, 48);

      // Add content - more space for header
      pdf.setFontSize(12);
      let yPosition = 60;

      // Headers for quote details
      pdf.setFontSize(14);
      pdf.text('QUOTATION DETAILS', 15, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);

      // Define consistent column positions for professional alignment
      const labelCol = 25;
      const valueCol = 75;
      const secondLabelCol = 115;
      const secondValueCol = 135;

      // Customer details with better alignment - standardized font size
      pdf.text('Customer Name:', labelCol, yPosition);
      pdf.text(formData.customerName || '—', valueCol, yPosition);
      yPosition += 7;

      // Mobile and Email aligned properly - consistent sizing
      pdf.text('Mobile:', labelCol, yPosition);
      pdf.text(formData.customerMobile || '—', valueCol, yPosition);
      pdf.text('Email:', secondLabelCol, yPosition);
      pdf.text(formData.customerEmail || '—', secondValueCol, yPosition);
      yPosition += 7;

      // System information - uniform sizing
      pdf.text('System Type:', labelCol, yPosition);
      pdf.text(`${estimate.project} • ${estimate.system}`, valueCol, yPosition);
      yPosition += 7;

      pdf.text('Capacity:', labelCol, yPosition);
      pdf.text(`${estimate.cap} kW`, valueCol, yPosition);
      yPosition += 10;

      // Price section
      pdf.setFontSize(14);
      pdf.text('ESTIMATED PRICING', 15, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);

      // Price values aligned consistently for professional appearance
      const priceCol = 150;

      // Gross Price - right aligned with standard number size
      pdf.text('Gross Price:', labelCol, yPosition);
      const grossPrice = currency(estimate.gross);
      pdf.text(grossPrice, priceCol - pdf.getTextWidth(grossPrice), yPosition);
      yPosition += 7;

      // Subsidy - right aligned with standard number size
      pdf.text('Subsidy:', labelCol, yPosition);
      const subsidyStr = estimate.subsidy ? ('- ' + currency(estimate.subsidy)) : '—';
      pdf.text(subsidyStr, priceCol - pdf.getTextWidth(subsidyStr), yPosition);
      yPosition += 8;

      // NET PRICE - emphasized but same number size as others
      pdf.setFontSize(14);
      pdf.text('NET PRICE:', labelCol, yPosition);
      pdf.setFontSize(12); // Consistent number size
      pdf.setTextColor(25, 113, 194);
      const netPrice = currency(estimate.net);
      pdf.text(netPrice, priceCol - pdf.getTextWidth(netPrice), yPosition);
      yPosition += 10;

      // Reset text color
      pdf.setTextColor(0, 0, 0);

      // Breakdown section
      pdf.setFontSize(12);
      pdf.text('DETAILED BREAKDOWN:', 15, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);

      // Equipment & Installation - right aligned with standard size
      pdf.text('Equipment & Installation:', labelCol, yPosition);
      const basePrice = currency(estimate.base);
      pdf.text(basePrice, priceCol - pdf.getTextWidth(basePrice), yPosition);
      yPosition += 7;

      // Battery - right aligned with standard size
      pdf.text('Battery:', labelCol, yPosition);
      const batteryStr = estimate.batteryCost ? currency(estimate.batteryCost) : '—';
      pdf.text(batteryStr, priceCol - pdf.getTextWidth(batteryStr), yPosition);
      yPosition += 7;

      // Monitoring - right aligned with standard size
      pdf.text('Monitoring:', labelCol, yPosition);
      const monitorStr = estimate.monitorCost ? currency(estimate.monitorCost) : '—';
      pdf.text(monitorStr, priceCol - pdf.getTextWidth(monitorStr), yPosition);
      yPosition += 10;

      // Additional info - better aligned
      pdf.setFontSize(10);
      pdf.text('Annual Generation Estimate:', labelCol, yPosition);
      pdf.text(`${Math.round(estimate.annualGeneration)} kWh`, valueCol, yPosition);
      yPosition += 6;

      pdf.text('CO₂ Offset:', labelCol, yPosition);
      pdf.text(`${estimate.co2.toFixed(2)} tons/year`, valueCol, yPosition);

      // Footer
      pdf.setFontSize(9);
      pdf.setTextColor(128, 128, 128);
      pdf.text('© Solar Captures - Valid for 7 days', 15, 270);
      pdf.text('This is a preliminary estimate. Final quote subject to site survey.', 15, 275);

      pdf.save(`${name}_solar_quote.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };



  const shareWhatsApp = () => {
    const phoneNumber = '9176279197';
    const url = `https://wa.me/${phoneNumber}`;
    window.open(url, '_blank');
  };

  const generateQuote = async () => {
    const newEstimate = computeEstimate();
    setEstimate(newEstimate);

    // Automatically download PDF after generating quote
    setTimeout(async () => {
      try {
        await downloadPDF();
      } catch (error) {
        console.error('Failed to auto-download PDF:', error);
        alert('Quote generated successfully! Please use the Download PDF button below.');
      }
    }, 500); // Increased delay to ensure state update and DOM render completes
  };

  return (
    <div className="min-h-screen bg-gray-100 py-7 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base">
              SC
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-black">Solar Captures — Instant Quotation</h1>
              <p className="text-xs sm:text-sm text-black mt-1">
                Get a quick preliminary quote. Works on mobile & desktop. Download as PDF or share via WhatsApp.
              </p>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
            {/* Stepper */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`flex-1 py-2 px-3 rounded-lg text-center text-xs sm:text-sm font-medium ${currentStep === step
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-200 text-black'
                    }`}
                >
                  {step}. {step === 1 ? 'Project' : step === 2 ? 'Details' : 'Review'}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Section */}
              <div className="lg:col-span-2">
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Project Type</label>
                      <select
                        value={formData.projectType}
                        onChange={(e) => updateFormData('projectType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      >
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="industrial">Industrial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">System Type</label>
                      <select
                        value={formData.systemType}
                        onChange={(e) => updateFormData('systemType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      >
                        <option value="ongrid">On-Grid</option>
                        <option value="offgrid">Off-Grid</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Desired Capacity (kW)</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.1"
                        value={formData.capacity}
                        onChange={(e) => updateFormData('capacity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Location (City / PIN)</label>
                      <input
                        type="text"
                        placeholder="e.g., Chennai, 600052"
                        value={formData.location}
                        onChange={(e) => updateFormData('location', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Battery (optional)</label>
                        <select
                          value={formData.batteryOption}
                          onChange={(e) => updateFormData('batteryOption', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          <option value="none">None</option>
                          <option value="small">Small (2–5 kWh)</option>
                          <option value="medium">Medium (6–12 kWh)</option>
                          <option value="large">Large (13–30 kWh)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Monitoring</label>
                        <select
                          value={formData.monitoring}
                          onChange={(e) => updateFormData('monitoring', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes (Smart Meter)</option>
                        </select>
                      </div>
                    </div>


                    <div className="flex justify-end pt-4">
                      <button
                        onClick={nextStep}
                        className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
                      >
                        Next: Details
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Customer Name</label>
                      <input
                        type="text"
                        placeholder="Name"
                        value={formData.customerName}
                        onChange={(e) => updateFormData('customerName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Mobile</label>
                        <input
                          type="text"
                          placeholder="10-digit mobile"
                          value={formData.customerMobile}
                          onChange={(e) => updateFormData('customerMobile', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Email</label>
                        <input
                          type="email"
                          placeholder="email@domain.com"
                          value={formData.customerEmail}
                          onChange={(e) => updateFormData('customerEmail', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Preferred Installation Timeline</label>
                      <select
                        value={formData.timeline}
                        onChange={(e) => updateFormData('timeline', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      >
                        <option>Within 1 month</option>
                        <option>1–3 months</option>
                        <option>Flexible</option>
                      </select>
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        onClick={prevStep}
                        className="px-6 py-3 bg-gray-200 text-black rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={nextStep}
                        className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
                      >
                        Next: Review
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-black">Review & Confirm</h3>
                    <p className="text-sm text-black">Review your details. Click generate to download PDF automatically.</p>

                    {estimate && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-black">Customer</span>
                          <span className="text-black">{formData.customerName || '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-black">Mobile / Email</span>
                          <span className="text-black">{formData.customerMobile || '—'} / {formData.customerEmail || '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-black">System</span>
                          <span className="text-black">{estimate.project} • {estimate.system} • {estimate.cap} kW</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-black">Estimated Net Price</span>
                          <span className="text-black">{currency(estimate.net)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-black">Annual Generation</span>
                          <span className="text-black">{Math.round(estimate.annualGeneration)} kWh</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-black">CO₂ offset</span>
                          <span className="text-black">{estimate.co2.toFixed(2)} tons/yr</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <button
                        onClick={prevStep}
                        className="px-6 py-3 bg-gray-200 text-black rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        Back
                      </button>
                      < button
                        onClick={generateQuote}
                        className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
                      >
                        Generate & Download Quote
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Section */}
              <div className="lg:col-span-1">
                <div ref={quoteCardRef} className="bg-white rounded-xl p-4 shadow-lg border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      SC
                    </div>
                    <div>
                      <div className="font-bold text-black">Solar Captures</div>
                      <div className="text-xs text-black">Preliminary Quotation</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-black">Customer</span>
                      <span className='text-black'>{formData.customerName || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black">System</span>
                      <span className='text-black'>
                        {estimate ? `${estimate.project} • ${estimate.system}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black">Capacity</span>
                      <span className='text-black'>{estimate ? `${estimate.cap} kW` : '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black">Est. Price</span>
                      <span className='text-black'>{estimate ? currency(estimate.net) : '—'}</span>
                    </div>

                    {estimate && (
                      <div className="border-t border-black pt-3 mt-3">
                        <div className="text-sm text-black mb-3">Breakdown</div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className='text-black'>Equipment & Installation</span>
                            <span className='text-black' >{currency(estimate.base)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className='text-black'>Battery</span>
                            <span className='text-black' >{estimate.batteryCost ? currency(estimate.batteryCost) : '—'}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className='text-black'>Monitoring</span>
                            <span className='text-black' >{estimate.monitorCost ? currency(estimate.monitorCost) : '—'}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className='text-black' >Subsidy</span>
                            <span className='text-black'>{estimate.subsidy ? ('- ' + currency(estimate.subsidy)) : '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={downloadPDF}
                      className="w-full px-3 py-2 bg-cyan-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-cyan-700 transition-colors mt-4"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={shareWhatsApp}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.525 3.588" />
                      </svg>
                      Contact Solar Captures on WhatsApp (9176279197)
                    </button>

                    <div className="text-xs text-black mt-3">
                      Note: This is a preliminary estimate. Final quote subject to site survey.
                    </div>
                  </div>
                </div>

                <div className="text-center text-xs text-black mt-3">
                  Tip: Use WhatsApp share button to quickly share your quote.
                </div>
              </div>
            </div>
          </div>

          <footer className="text-center text-xs text-black mt-6">
            © Solar Captures — Instant Quotation • Valid for 7 days
          </footer>
        </div>
      </div>
    </div>
  );
}
