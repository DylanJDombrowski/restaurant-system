// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";
// import { supabase } from "@/lib/supabase/client";

// This is a React Server Component (RSC), so we can fetch data directly.
export default async function HomePage() {
  // Fetch the primary restaurant's data to personalize the welcome message.
  // In a true multi-tenant landing page, you might not do this, or you'd
  // have a different way of featuring a client. For now, this follows your original pattern.
  // const { data: restaurant } = await supabase
  //   .from("restaurants")
  //   .select("name")
  //   .limit(1)
  //   .single();

  return (
    <>
      {/* This style block is included here for self-containment. 
        In a larger application, these custom utility classes might be moved 
        to your globals.css file. 
      */}
      <style>{`
        .gradient-text {
            background: linear-gradient(to right, #4F46E5, #EC4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .feature-icon {
            background-image: linear-gradient(135deg, #f5f3ff, #ecfccb);
        }
      `}</style>

      <div className="bg-white text-gray-800">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="text-2xl font-bold text-gray-900">
                  <span className="gradient-text">Order</span>Flow
                </Link>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a
                    href="#features"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Features
                  </a>
                  <a
                    href="#pricing"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Pricing
                  </a>
                  <Link
                    href="/staff" // Link to the staff login/dashboard
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/contact" // Placeholder for a contact or signup page
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
              <div className="md:hidden">
                <button
                  type="button"
                  className="bg-gray-200 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                  aria-controls="mobile-menu"
                  aria-expanded="false"
                >
                  <span className="sr-only">Open main menu</span>
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div>
          <div className="relative">
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              <div className="relative shadow-xl sm:rounded-2xl sm:overflow-hidden">
                <Image
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2574&auto=format&fit=crop"
                  alt="Restaurant interior"
                  fill
                  priority
                  sizes="100vw"
                  style={{ objectFit: "cover" }}
                />

                <div className="absolute inset-0 bg-gray-800 mix-blend-multiply"></div>
              </div>
              <div className="relative px-4 py-16 sm:px-6 sm:py-24 lg:py-32 lg:px-8">
                <h1 className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  <span className="block text-white">
                    The Modern Point of Sale
                  </span>
                  <span className="block gradient-text">
                    Built for Your Restaurant
                  </span>
                </h1>
                <p className="mt-6 max-w-lg mx-auto text-center text-xl text-gray-900 sm:max-w-3xl">
                  Streamline your operations from front-of-house to kitchen with
                  an intuitive, powerful, and flexible POS system designed to
                  help you grow. Currently powering{" "}
                  <span className="font-bold text-gray-900">
                    {"restaurants like yours"}
                  </span>
                  .
                </p>
                <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
                  <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
                    <Link
                      href="/contact" // Placeholder
                      className="flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-600 bg-white hover:bg-indigo-50 sm:px-8"
                    >
                      Get Started
                    </Link>
                    <Link
                      href="/demo" // Placeholder
                      className="flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-500 bg-opacity-60 hover:bg-opacity-70 sm:px-8"
                    >
                      Request a Demo
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Section */}
        <div id="features" className="bg-gray-50 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">
                Your All-in-One Platform
              </h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Everything you need, nothing you don&apos;t.
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                From complex customizations to real-time kitchen updates, our
                system is designed to handle the unique demands of your
                restaurant.
              </p>
            </div>
            <div className="mt-12">
              <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md feature-icon text-indigo-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715.93 9.75l.93-1.035a.75.75 0 0 0-.43-1.298L16.5 5.25l-.813 2.846a4.5 4.5 0 0 0 3.09 3.09L21.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09L15 18.75l-.93-1.035a.75.75 0 0 0-1.298.43L12 21.75l.813-2.846a4.5 4.5 0 0 0-3.09-3.09L6.75 15l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L13.5 8.25l.93 1.035A.75.75 0 0 0 15.75 9l1.498-.435a.75.75 0 0 0 .43-1.298Z"
                        />
                      </svg>
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                      Advanced Menu Customization
                    </p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Handle any order, no matter how complex. From multi-tiered
                    pizza toppings to variant-specific chicken dinner sides, our
                    system ensures every detail is captured accurately.
                  </dd>
                </div>
                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md feature-icon text-indigo-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                        />
                      </svg>
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                      Real-Time Kitchen Display
                    </p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Orders appear on your Kitchen Display System (KDS)
                    instantly. Keep your kitchen staff in sync and reduce ticket
                    times with a clear, live view of the order queue.
                  </dd>
                </div>
                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md feature-icon text-indigo-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A11.953 11.953 0 0 1 12 16.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12a8.959 8.959 0 0 1-2.157 5.253m0 0A9.004 9.004 0 0 1 12 21"
                        />
                      </svg>
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                      Online & In-Person Ordering
                    </p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Manage phone orders, walk-ins, and online orders from a
                    single, unified system. Offer your customers the convenience
                    of ordering how they want, when they want.
                  </dd>
                </div>
                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md feature-icon text-indigo-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52v1.666m-3.091-1.666a24.938 24.938 0 0 1-3.414.417m-3.414-.417a24.938 24.938 0 0 0-3.414.417m6.828 0a24.92 24.92 0 0 0-3.414-.417M6.75 4.97a48.416 48.416 0 0 1-3-.52m3 .52v1.666m-3.091-1.666a24.938 24.938 0 0 0-3.414.417m-3.414-.417a24.938 24.938 0 0 1-3.414.417M12 9.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm0 0a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Z"
                        />
                      </svg>
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                      Powerful Analytics
                    </p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Make data-driven decisions. Understand your sales trends,
                    most popular items, and peak hours with an easy-to-use
                    analytics dashboard built for restaurant owners.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="bg-white py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Simple, Transparent Pricing
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Choose a plan that scales with your business. No hidden fees.
              </p>
            </div>
            <div className="mt-12 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
              <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
                <div className="p-6">
                  <h2 className="text-lg leading-6 font-medium text-gray-900">
                    Starter
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    For new restaurants or single locations getting started.
                  </p>
                  <p className="mt-4">
                    <span className="text-4xl font-extrabold text-gray-900">
                      $59
                    </span>
                    <span className="text-base font-medium text-gray-500">
                      /mo per terminal
                    </span>
                  </p>
                </div>
                <div className="pt-6 pb-8 px-6">
                  <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                    What&apos;s included
                  </h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>POS & Order Management</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>Menu Management</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>Basic Analytics</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="border-2 border-indigo-600 rounded-lg shadow-sm divide-y divide-gray-200 relative">
                <div className="absolute top-0 right-0 -mt-3 mr-3">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    Most Popular
                  </span>
                </div>
                <div className="p-6">
                  <h2 className="text-lg leading-6 font-medium text-gray-900">
                    Pro
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    For growing businesses that need more power.
                  </p>
                  <p className="mt-4">
                    <span className="text-4xl font-extrabold text-gray-900">
                      $99
                    </span>
                    <span className="text-base font-medium text-gray-500">
                      /mo per terminal
                    </span>
                  </p>
                </div>
                <div className="pt-6 pb-8 px-6">
                  <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                    What&apos;s included
                  </h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>Everything in Starter</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>Online Ordering Portal</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>Loyalty Program</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>Caller ID Integration</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
                <div className="p-6">
                  <h2 className="text-lg leading-6 font-medium text-gray-900">
                    Enterprise
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    For multi-location businesses and franchises.
                  </p>
                  <p className="mt-8">
                    <span className="text-4xl font-extrabold text-gray-900">
                      Custom
                    </span>
                  </p>
                </div>
                <div className="pt-6 pb-8 px-6">
                  <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                    What&apos;s included
                  </h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>Everything in Pro</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>Multi-Location Management</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>Advanced API Access</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-green-500">✔</span>
                      <span>Dedicated Support</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-800">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="xl:grid xl:grid-cols-3 xl:gap-8">
              <div className="space-y-8 xl:col-span-1">
                <Link href="/" className="text-2xl font-bold text-white">
                  <span className="gradient-text">Order</span>Flow
                </Link>
                <p className="text-gray-400 text-base">
                  The command center for your restaurant.
                </p>
              </div>
              <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
                <div className="md:grid md:grid-cols-2 md:gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                      Solutions
                    </h3>
                    <ul role="list" className="mt-4 space-y-4">
                      <li>
                        <a
                          href="#"
                          className="text-base text-gray-300 hover:text-white"
                        >
                          Point of Sale
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="text-base text-gray-300 hover:text-white"
                        >
                          Online Ordering
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="text-base text-gray-300 hover:text-white"
                        >
                          Kitchen Display
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="text-base text-gray-300 hover:text-white"
                        >
                          Analytics
                        </a>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-12 md:mt-0">
                    <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                      Company
                    </h3>
                    <ul role="list" className="mt-4 space-y-4">
                      <li>
                        <a
                          href="#"
                          className="text-base text-gray-300 hover:text-white"
                        >
                          About
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="text-base text-gray-300 hover:text-white"
                        >
                          Careers
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="text-base text-gray-300 hover:text-white"
                        >
                          Contact
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="md:grid md:grid-cols-2 md:gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                      Legal
                    </h3>
                    <ul role="list" className="mt-4 space-y-4">
                      <li>
                        <a
                          href="#"
                          className="text-base text-gray-300 hover:text-white"
                        >
                          Privacy
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="text-base text-gray-300 hover:text-white"
                        >
                          Terms
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 border-t border-gray-700 pt-8">
              <p className="text-base text-gray-400 xl:text-center">
                &copy; 2025 OrderFlow, Inc. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
