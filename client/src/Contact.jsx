import Avatar from "./Avatar";
import PropTypes from 'prop-types';

Contact.propTypes = {
  onClick: PropTypes.func.isRequired,
  userId: PropTypes.string.isRequired,
  selectedUserId: PropTypes.string,
  username: PropTypes.string.isRequired,
  online: PropTypes.bool.isRequired,
};
export default function Contact({ onClick, userId, selectedUserId, username ,online}) {
  return (
    <div
      onClick={() => onClick(userId)}
      className={
        "border-b border-gray-100 flex gap-2 items-center cursor-pointer " +
        (selectedUserId === userId ? "bg-blue-100" : "")
      }
      key={userId}
    >
      {userId === selectedUserId && (
        <div className="w-1 bg-blue-500 h-12 rounded-sm"></div>
      )}
      <div className="flex gap-2 items-center py-2 pl-4">
        <Avatar online={online} userId={userId} username={username} />
        <span className="text-gray-800">{username}</span>
      </div>
    </div>
  );
}
