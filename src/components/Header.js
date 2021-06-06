import React, { useState } from 'react'
import Logo from './../assets/icons/hashtag.svg'
import { Link } from 'react-router-dom'

function Header() {

    const [active, setActive] = useState(false)

    const onClick = () => {
        setActive(!active)
    }

    return (
        <header className="bg-white relative">
            <div className="max-w-7xl mx-auto flex items-center justify-between p-2.5 font-extrabold">
                <div className="w-14">
                    <Link to="/">
                        <img alt="site logo" src={Logo} className="w-full"></img>
                    </Link>
                </div>

                <div onClick={onClick}
                    className={`
                        md:hidden uppercase
                    `}
                >
                    Menu
                </div>

                <nav className={`${!active && 'hidden'} absolute flex flex-col bg-blue-100 bg-opacity-30
                    top-full w-full left-0 z-99 md:static md:w-auto md:flex md:bg-white md:bg-opacity-0`}
                >
                    <ul className="md:flex">

                        <li className="list-none md:mr-5">
                            <Link to="/"
                                className="flex w-full text-base uppercase hover:text-blue-300 cursor-pointer 
                                pt-2.5 px-2.5
                                "
                            >
                                Home
                        </Link>
                        </li>

                        <li className="list-none md:mr-5">
                            <Link to="/encode"
                                className="flex w-full text-base uppercase hover:text-blue-300 cursor-pointer 
                                pt-2.5 px-2.5
                                "
                            >
                                Encode
                        </Link>
                        </li>

                        <li className="list-none md:mr-5">
                            <Link to="/decode"
                                className="flex w-full text-base uppercase hover:text-blue-300 cursor-pointer 
                                pt-2.5 px-2.5
                                "
                            >
                                Decode
                        </Link>
                        </li>

                        <li className="list-none md:mr-5">
                            <Link to="/about"
                                className="flex w-full text-base uppercase hover:text-blue-300 cursor-pointer 
                                pt-2.5 px-2.5
                                "
                            >
                                About
                        </Link>
                        </li>

                    </ul>
                </nav>
            </div>
        </header>
    )
}

export default Header
