import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, X } from "lucide-react"
import { DocumentIcon } from "@heroicons/react/24/outline"
import { FaDev, FaGithub } from "react-icons/fa"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <header className="w-full bg-neutral-100">
      <div className="flex justify-end items-center px-4 py-3">
        <div className="flex items-center space-x-4">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="text-base flex items-center space-x-2 px-3 py-2 text-green-700
                           hover:bg-green-50 hover:text-green-800 
                           transition-all duration-200 ease-in-out 
                           rounded-md
                           hover:shadow-md hover:scale-105 
                           active:scale-100 active:shadow-sm"
              >
                <DocumentIcon className="h-6 w-6" />
                <span className="font-medium">Materials</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              <DropdownMenuItem 
                className="flex items-center p-3 space-x-3 hover:bg-blue-50 rounded-md transition-colors"
                asChild
              >
                <a href="https://github.com/DineshTeja/aria" target="_blank" rel="noopener noreferrer">
                  <FaGithub className="h-5 w-5 text-green-700" />
                  <div>
                    <p className="font-medium">Github</p>
                    <p className="text-sm text-gray-500">View our repository!</p>
                  </div>
                </a>
              </DropdownMenuItem> 
              <DropdownMenuItem 
                className="flex items-center p-3 space-x-3 hover:bg-blue-50 rounded-md transition-colors"
                asChild
              >
                <a href="https://devpost.com/software/aria-sc10g2#updates" target="_blank" rel="noopener noreferrer">
                  <FaDev className="h-5 w-5 text-green-700" />
                  <div>
                    <p className="font-medium">Devpost</p>
                    <p className="text-sm text-gray-500">Check out our Devpost page!</p>
                  </div>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={toggleMenu} className="md:hidden">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </header>
  )
}