/* eslint-disable react/prop-types */

export default function Avatar({ userId, username, online }) {
  const colors = [
    "bg-teal-200",
    "bg-red-200",
    "bg-green-200",
    "bg-purple-200",
    "bg-blue-200",
    "bg-yellow-200",
    "bg-orange-200",
    "bg-pink-200",
    "bg-fuchsia-200",
    "bg-rose-200",
  ];

  const userIdBase10 = parseInt(userId.substring(10), 16);
  const colorIndex = userIdBase10 % colors.length;
  const color = colors[colorIndex];
  return (
    <div
      className={"w-10 h-10 rounded-full flex items-center relative " + color}
    >
      <div className="text-center w-full opacity-80">
        {username[0].toUpperCase()}
      </div>
      {online && (
        <div className="absolute w-3 h-3 bg-green-400 rounded-full right-0 bottom-0 border border-white shadow-sm shadow-black"></div>
      )}
      {!online && (
        <div className="absolute w-3 h-3 bg-gray-400 rounded-full right-0 bottom-0 border border-white shadow-sm shadow-black"></div>
      ) }
    </div>
  );
}
