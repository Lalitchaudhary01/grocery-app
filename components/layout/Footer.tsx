import Image from "next/image";
import Link from "next/link";
import { Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200">
      <div className="mx-auto max-w-7xl px-6 py-14">
        
        <div className="grid gap-12 md:grid-cols-3 items-start">
          
          {/* Logo Section */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Image
              src="/logos.png"  // 👈 apna correct file name daal
              alt="Apni Dukaan Logo"
              width={300}
              height={120}
              priority
              className="w-56 md:w-64 h-auto object-contain"
            />

            <p className="mt-4 text-2xl font-extrabold tracking-tight">
              <span className="text-green-600">Apni </span>
              <span className="text-yellow-500">Dukaan</span>
            </p>

            <p className="mt-2 text-sm text-neutral-500">
              Fresh Groceries • Fast Delivery
            </p>
          </div>

          {/* Contact Section */}
          <div className="space-y-4 text-sm text-neutral-700">
            <h3 className="font-semibold text-neutral-900 text-base">
              Contact Us
            </h3>

            <Link
              href="tel:+918923541428"
              className="flex items-center gap-2 hover:text-green-600 transition font-medium"
            >
              <Phone size={16} />
              +91 8923541428
            </Link>

            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-1" />
              <span>
                In Front of New Tehsil, Ramanand Puram Colony,
                Hathras Road, Iglas, Aligarh
              </span>
            </div>
          </div>

          {/* Extra Section */}
          <div className="text-sm text-neutral-700">
            <h3 className="font-semibold text-neutral-900 mb-4 text-base">
              Why Choose Us?
            </h3>
            <ul className="space-y-2">
              <li className="hover:text-green-600 transition">✔ Fresh & Quality Products</li>
              <li className="hover:text-green-600 transition">✔ Affordable Prices</li>
              <li className="hover:text-green-600 transition">✔ Quick Local Delivery</li>
            </ul>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="mt-14 border-t border-neutral-200 pt-6 text-xs text-neutral-500 text-center">
          © {new Date().getFullYear()} Apni Dukaan. All rights reserved.
        </div>

      </div>
    </footer>
  );
}